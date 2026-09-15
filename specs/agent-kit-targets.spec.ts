import { describe, expect, it, vi } from "vitest";

/**
 * `resolveAgentTargets` / `getValidAgentKitTargets` must:
 *  - resolve the default (`claude`) fully offline, never touching `fetch`.
 *  - validate an explicit non-default target against a dynamically fetched
 *    list, and throw (naming every valid target) when it is not on it.
 *  - fail VISIBLY — not silently fall back — when the fetch fails and there
 *    is no usable cache.
 *
 * `fetch` is injected explicitly (the module's default parameter) so these
 * specs never make a real network call. The local cache file is mocked out
 * entirely (`node:fs`) so specs never depend on — or pollute — the real
 * machine's cache directory, and each test starts from "no cache".
 */

let cacheFile: string | undefined;

vi.mock("node:fs", () => ({
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(() => {
    if (cacheFile === undefined) {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    }
    return cacheFile;
  }),
  writeFileSync: vi.fn((_path: string, content: string) => {
    cacheFile = content;
  }),
}));

import {
  BUILTIN_AGENT_KIT_TARGETS,
  DEFAULT_AGENT_KIT_TARGET,
  resolveAgentTargets,
} from "../src/features/agent-kit-targets";

function fakeFetch(bodies: Record<string, string>) {
  return vi.fn(async (url: string) => {
    const body = bodies[url];
    if (body === undefined) {
      return { ok: false, status: 404, text: async () => "" } as Response;
    }
    return { ok: true, status: 200, text: async () => body } as Response;
  });
}

const LLMS_TXT = `[Agent integrations](https://github.com/hassanzohdy/agent-kit/blob/main/skills/agent-integrations/SKILL.md): Per-IDE setup walkthroughs`;
const AGENT_INTEGRATIONS_DOC = `
| Agent | Target |
| Claude Code | --target claude |
| Cursor | --target cursor |
| Antigravity | --target antigravity |
`;
const AGENT_INTEGRATIONS_DOC_URL =
  "https://raw.githubusercontent.com/hassanzohdy/agent-kit/main/skills/agent-integrations/SKILL.md";
const LLMS_TXT_URL = "https://mongez.js.org/agent-kit/llms.txt";

describe("resolveAgentTargets", () => {
  it("resolves the default target without ever calling fetch", async () => {
    const fetchImpl = vi.fn();

    const targets = await resolveAgentTargets(undefined, fetchImpl as any);

    expect(targets).toEqual([DEFAULT_AGENT_KIT_TARGET]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("resolves an explicit built-in-only selection without calling fetch", async () => {
    const fetchImpl = vi.fn();

    const targets = await resolveAgentTargets(["claude"], fetchImpl as any);

    expect(targets).toEqual(["claude"]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("validates a non-default target against the dynamically fetched list", async () => {
    cacheFile = undefined;
    const fetchImpl = fakeFetch({
      [LLMS_TXT_URL]: LLMS_TXT,
      [AGENT_INTEGRATIONS_DOC_URL]: AGENT_INTEGRATIONS_DOC,
    });

    const targets = await resolveAgentTargets(["antigravity"], fetchImpl as any);

    expect(targets).toEqual(["antigravity"]);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("rejects an invalid target, listing every valid target in the error", async () => {
    cacheFile = undefined;
    const fetchImpl = fakeFetch({
      [LLMS_TXT_URL]: LLMS_TXT,
      [AGENT_INTEGRATIONS_DOC_URL]: AGENT_INTEGRATIONS_DOC,
    });

    await expect(
      resolveAgentTargets(["not-a-real-target"], fetchImpl as any),
    ).rejects.toThrow(/Unknown agent-kit target\(s\): not-a-real-target/);

    cacheFile = undefined;
    await expect(
      resolveAgentTargets(["not-a-real-target"], fetchImpl as any),
    ).rejects.toThrow(/claude/);
  });

  it("fails visibly (never silently falls back) when the fetch fails and there is no cache", async () => {
    cacheFile = undefined;
    const fetchImpl = vi.fn(async () => {
      throw new Error("network unreachable");
    });

    await expect(
      resolveAgentTargets(["cursor"], fetchImpl as any),
    ).rejects.toThrow(/Could not determine the valid agent-kit targets/);
  });

  it("falls back to a previously cached list (not a silent guess — a real prior fetch) when a fresh fetch fails", async () => {
    cacheFile = undefined;
    const goodFetch = fakeFetch({
      [LLMS_TXT_URL]: LLMS_TXT,
      [AGENT_INTEGRATIONS_DOC_URL]: AGENT_INTEGRATIONS_DOC,
    });
    await resolveAgentTargets(["cursor"], goodFetch as any);
    expect(cacheFile).toBeDefined();

    const brokenFetch = vi.fn(async () => {
      throw new Error("network unreachable");
    });

    const targets = await resolveAgentTargets(["cursor"], brokenFetch as any);
    expect(targets).toEqual(["cursor"]);
  });

  it("built-in fallback always contains the default target", () => {
    expect(BUILTIN_AGENT_KIT_TARGETS).toContain(DEFAULT_AGENT_KIT_TARGET);
  });
});
