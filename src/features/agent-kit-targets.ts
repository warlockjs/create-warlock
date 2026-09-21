import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const requireFromHere = createRequire(import.meta.url);

/**
 * `agent-kit` target selection for the scaffolder's `--agents` flag.
 *
 * The valid target list is NOT hardcoded here as a literal source of truth —
 * it is derived, in order of preference, from:
 *
 *   1. The `@mongez/agent-kit` package installed alongside `create-warlock`
 *      itself, when its own metadata exposes a target list.
 *   2. A runtime fetch of https://mongez.js.org/agent-kit/llms.txt, cached
 *      locally so repeated runs do not refetch.
 *
 * The one exception is `claude`, the default target: it MUST work fully
 * offline, so it is a tiny built-in fallback rather than something that ever
 * depends on a successful network call.
 */

/** The only target guaranteed valid with no network access and no cache. */
export const BUILTIN_AGENT_KIT_TARGETS: readonly string[] = ["claude"];

/** The default `--agents` value when the flag is not passed. */
export const DEFAULT_AGENT_KIT_TARGET = "claude";

const AGENT_KIT_LLMS_URL = "https://mongez.js.org/agent-kit/llms.txt";

/**
 * How long the whole remote lookup may take.
 *
 * An unbounded `fetch` does not fail on a stalled network — it WAITS, and a
 * caller that only handles rejection never gets to run its fallback. The
 * scaffolder's wizard asks this question six answers in, so "hangs forever"
 * is strictly worse than "gives up and offers the built-ins".
 *
 * Each request carries an abort signal so the socket is actually torn down,
 * and {@link getValidAgentKitTargets} additionally races the whole operation,
 * because an injected `fetchImpl` is under no obligation to honour a signal.
 */
export const AGENT_KIT_FETCH_TIMEOUT_MS = 5_000;

/** Local cache of the last successfully fetched/derived target list. */
function cacheFilePath(): string {
  const base = process.env.XDG_CACHE_HOME ?? path.join(homedir(), ".cache");
  return path.join(base, "create-warlock", "agent-kit-targets.json");
}

function readCache(): string[] | undefined {
  try {
    const raw = readFileSync(cacheFilePath(), "utf8");
    const parsed = JSON.parse(raw) as { targets?: unknown };
    if (Array.isArray(parsed.targets)) {
      return parsed.targets.filter(
        (value): value is string => typeof value === "string",
      );
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function writeCache(targets: string[]): void {
  try {
    const filePath = cacheFilePath();
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      JSON.stringify({ targets, fetchedAt: new Date().toISOString() }),
      "utf8",
    );
  } catch {
    // The cache is a best-effort convenience — a read-only filesystem must
    // never turn a successful fetch into a failed run.
  }
}

/**
 * Best-effort read of the installed `@mongez/agent-kit` package's own
 * declared target list, when it publishes one. Returns `undefined` (never
 * throws) when the package is not installed or exposes no such metadata —
 * the caller falls back to the network source.
 */
function readInstalledPackageTargets(): string[] | undefined {
  for (const base of [process.cwd(), tmpdir()]) {
    try {
      const packageJsonPath = requireFromHere.resolve(
        "@mongez/agent-kit/package.json",
        { paths: [base] },
      );
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        agentKit?: { targets?: unknown };
      };
      if (Array.isArray(pkg.agentKit?.targets)) {
        return pkg.agentKit.targets.filter(
          (value): value is string => typeof value === "string",
        );
      }
    } catch {
      // Not installed, or no metadata — try the next base / fall through.
    }
  }
  return undefined;
}

/**
 * Pull the agent-integrations doc's raw `--target <slug>` occurrences out of
 * `agent-kit`'s own llms.txt index (following the link it documents for
 * itself), so the concrete slug list is parsed from the source rather than
 * retyped here.
 */
export async function fetchRemoteAgentKitTargets(
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = AGENT_KIT_FETCH_TIMEOUT_MS,
): Promise<string[]> {
  const indexResponse = await fetchImpl(AGENT_KIT_LLMS_URL, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!indexResponse.ok) {
    throw new Error(
      `agent-kit llms.txt request failed with HTTP ${indexResponse.status}`,
    );
  }
  const index = await indexResponse.text();

  const rawLinkMatch = index.match(
    /\[Agent integrations\]\((https:\/\/[^)]+agent-integrations[^)]*)\)/,
  );

  const docUrl = rawLinkMatch?.[1]
    ?.replace("github.com", "raw.githubusercontent.com")
    .replace("/blob/", "/");

  const targets = new Set<string>();

  if (docUrl) {
    const docResponse = await fetchImpl(docUrl, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (docResponse.ok) {
      const doc = await docResponse.text();
      for (const match of doc.matchAll(/--target[= ]([a-z][a-z0-9-]*)/gi)) {
        const target = match[1];

        if (target) targets.add(target.toLowerCase());
      }
    }
  }

  if (targets.size === 0) {
    throw new Error(
      "Could not parse any agent-kit target names out of the fetched docs",
    );
  }

  return [...targets];
}

/**
 * Resolve the full list of valid `agent-kit` targets, trying the installed
 * package first, then the cache-backed network fetch.
 *
 * Throws when neither source succeeds — the caller only reaches this for an
 * explicitly requested NON-default target, where a silent fallback to a
 * stale or guessed list would be worse than a clear failure.
 */
export async function getValidAgentKitTargets(
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = AGENT_KIT_FETCH_TIMEOUT_MS,
): Promise<string[]> {
  const installed = readInstalledPackageTargets();
  if (installed && installed.length > 0) {
    return dedupe([...BUILTIN_AGENT_KIT_TARGETS, ...installed]);
  }

  try {
    const fetched = await withTimeout(
      fetchRemoteAgentKitTargets(fetchImpl, timeoutMs),
      timeoutMs,
    );
    writeCache(fetched);
    return dedupe([...BUILTIN_AGENT_KIT_TARGETS, ...fetched]);
  } catch (fetchError) {
    const cached = readCache();
    if (cached && cached.length > 0) {
      return dedupe([...BUILTIN_AGENT_KIT_TARGETS, ...cached]);
    }
    throw new Error(
      `Could not determine the valid agent-kit targets (fetch failed and no cache exists): ${
        (fetchError as Error).message
      }`,
    );
  }
}

/**
 * Reject if `work` has not settled within `timeoutMs`.
 *
 * The abort signals on each request cover the real network; this covers the
 * case they cannot — a `fetchImpl` that ignores its signal, or a promise that
 * simply never settles. Without it "bounded" would be a property of the
 * happy path only.
 */
export async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `agent-kit target lookup timed out after ${timeoutMs}ms`,
              ),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Resolve and validate the `--agents` selection.
 *
 * An unset or empty selection resolves to `[DEFAULT_AGENT_KIT_TARGET]`
 * without touching the disk or the network. A selection made entirely of
 * built-in targets (today, just `claude`) is likewise resolved offline. Only
 * an explicit NON-default target triggers {@link getValidAgentKitTargets},
 * and an invalid one throws, naming every valid target it found.
 */
export async function resolveAgentTargets(
  requested: string[] | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const targets =
    requested && requested.length > 0 ? requested : [DEFAULT_AGENT_KIT_TARGET];

  const needsValidation = targets.some(
    target => !BUILTIN_AGENT_KIT_TARGETS.includes(target),
  );

  if (!needsValidation) {
    return targets;
  }

  const valid = await getValidAgentKitTargets(fetchImpl);
  const invalid = targets.filter(target => !valid.includes(target));

  if (invalid.length > 0) {
    throw new Error(
      `Unknown agent-kit target(s): ${invalid.join(", ")} — valid targets: ${valid
        .slice()
        .sort()
        .join(", ")}`,
    );
  }

  return targets;
}
