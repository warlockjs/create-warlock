/**
 * Resolving the version to stamp onto the generated project's `@warlock.js/*`
 * dependencies.
 *
 * ## Why this file exists
 *
 * The scaffolder used to stamp its OWN version onto every sibling package
 * (`"@warlock.js/core": "4.16.2"`). That is only correct while the scaffolder's
 * version is published — and it usually is not: the release tooling bumps the
 * source version on every build, including `--no-publish` builds, so between
 * publishes the working tree carries a version that exists nowhere on the
 * registry. Every project scaffolded in that window pinned eight dependencies
 * to a version npm cannot resolve, and the install died with `ETARGET`.
 *
 * ## The rule
 *
 * Never write a dependency version we have not established exists. Resolution
 * order, per package:
 *
 *   1. the scaffolder's own version, IF the registry has it published — this
 *      preserves the lockstep guarantee the pin was introduced for;
 *   2. otherwise the registry's `latest` — the newest thing that actually
 *      exists, with a note explaining the substitution;
 *   3. otherwise (registry unreachable) a caret range floored to the major,
 *      e.g. `^4.0.0` — always satisfiable by any published 4.x, and the
 *      scaffold-time install writes a lockfile that freezes the result anyway.
 *
 * A package that resolves to nothing (404 — never published) is reported, not
 * papered over: it is the difference between "your install failed" and "the
 * feature you asked for does not exist yet".
 */

import { getJsonFile } from "@warlock.js/fs";
import { packageRoot, template } from "./paths";

export type VersionSource =
  "own-version" | "registry-latest" | "range-fallback";

export type ResolvedVersion = {
  package: string;
  /** The exact version or range to write into the generated package.json. */
  version: string;
  source: VersionSource;
};

export type VersionResolution = {
  /** package name -> version/range to stamp. */
  versions: Record<string, string>;
  /** Human-readable notes worth showing before the install runs. */
  notes: string[];
  /** Packages the registry does not know about at all. */
  unpublished: string[];
  /** True when the registry could not be reached and ranges were guessed. */
  offline: boolean;
};

const REGISTRY_TIMEOUT_MS = 6_000;

/**
 * Registry to query. `npm_config_registry` is set by npm/npx when the
 * scaffolder runs through them, so a private mirror is honoured for free.
 */
function registryUrl(): string {
  const registry =
    process.env.npm_config_registry?.trim() || "https://registry.npmjs.org";

  return registry.replace(/\/+$/, "");
}

/** `4.16.2` -> `^4.0.0`; anything unparseable -> `latest`. */
export function fallbackRange(version: string): string {
  const major = /^\s*v?(\d+)\./.exec(version)?.[1];

  return major ? `^${major}.0.0` : "latest";
}

type Packument = {
  "dist-tags"?: Record<string, string>;
  versions?: Record<string, unknown>;
};

/**
 * Fetch the abbreviated packument for a package. Returns `undefined` when the
 * registry cannot be reached (network / timeout) and `null` when the registry
 * answers that the package does not exist.
 */
async function fetchPackument(
  packageName: string,
): Promise<Packument | null | undefined> {
  const url = `${registryUrl()}/${packageName.replace("/", "%2F")}`;

  try {
    const response = await fetch(url, {
      headers: { accept: "application/vnd.npm.install-v1+json" },
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
    });

    // 404 (public) and 401 (scoped package the registry hides) both mean the
    // same thing to us: there is nothing here to install.
    if (response.status === 404 || response.status === 401) return null;

    if (!response.ok) return undefined;

    return (await response.json()) as Packument;
  } catch {
    return undefined;
  }
}

/**
 * Resolve one package against the registry. Pure aside from the fetch, so the
 * decision table above is readable in one place.
 */
async function resolvePackage(
  packageName: string,
  ownVersion: string,
): Promise<ResolvedVersion & { published: boolean; reachable: boolean }> {
  const packument = await fetchPackument(packageName);

  if (packument === undefined) {
    return {
      package: packageName,
      version: fallbackRange(ownVersion),
      source: "range-fallback",
      published: true,
      reachable: false,
    };
  }

  if (packument === null) {
    return {
      package: packageName,
      version: fallbackRange(ownVersion),
      source: "range-fallback",
      published: false,
      reachable: true,
    };
  }

  if (packument.versions?.[ownVersion]) {
    return {
      package: packageName,
      version: ownVersion,
      source: "own-version",
      published: true,
      reachable: true,
    };
  }

  const latest = packument["dist-tags"]?.latest;

  if (latest) {
    return {
      package: packageName,
      version: latest,
      source: "registry-latest",
      published: true,
      reachable: true,
    };
  }

  return {
    package: packageName,
    version: fallbackRange(ownVersion),
    source: "range-fallback",
    published: true,
    reachable: true,
  };
}

/**
 * Every `@warlock.js/*` dependency the template declares. Read from the
 * template rather than the copied project so resolution can start before (or
 * in parallel with) the copy.
 */
export function templateWarlockDependencies(): string[] {
  const templatePackageJson = getJsonFile(
    `${template("warlock")}/package.json`,
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const names = new Set<string>();

  for (const field of ["dependencies", "devDependencies"] as const) {
    for (const name of Object.keys(templatePackageJson[field] ?? {})) {
      if (name.startsWith("@warlock.js/")) names.add(name);
    }
  }

  return [...names];
}

/** The scaffolder's own published version, i.e. the lockstep candidate. */
export function scaffolderVersion(): string {
  return (getJsonFile(packageRoot("package.json")) as { version: string })
    .version;
}

let cached: Promise<VersionResolution> | undefined;

/**
 * Resolve the versions to stamp, once per process.
 *
 * Never throws and never blocks a scaffold: the worst case is the caret
 * fallback plus a note saying so.
 */
export function resolveWarlockVersions(
  packages: string[] = templateWarlockDependencies(),
  ownVersion: string = scaffolderVersion(),
): Promise<VersionResolution> {
  if (cached) return cached;

  cached = (async (): Promise<VersionResolution> => {
    const resolutions = await Promise.all(
      packages.map(name => resolvePackage(name, ownVersion)),
    );

    const versions: Record<string, string> = {};
    const notes: string[] = [];
    const unpublished: string[] = [];
    const substituted: ResolvedVersion[] = [];

    let offline = false;

    for (const resolution of resolutions) {
      versions[resolution.package] = resolution.version;

      if (!resolution.reachable) offline = true;
      if (!resolution.published) unpublished.push(resolution.package);
      if (resolution.source === "registry-latest") substituted.push(resolution);
    }

    if (offline) {
      notes.push(
        `Could not reach the npm registry — pinning @warlock.js/* to ${fallbackRange(ownVersion)} instead of an exact version.`,
      );
    }

    if (substituted.length > 0) {
      const latest = substituted[0].version;

      notes.push(
        `create-warlock ${ownVersion} is not published yet — pinning @warlock.js/* to the latest published version (${latest}).`,
      );
    }

    if (unpublished.length > 0) {
      notes.push(
        `Not published on the registry: ${unpublished.join(", ")} — the install will fail until they are released.`,
      );
    }

    return { versions, notes, unpublished, offline };
  })();

  return cached;
}

/** Test/CLI seam: forget the memoized resolution. */
export function resetWarlockVersionsCache() {
  cached = undefined;
}
