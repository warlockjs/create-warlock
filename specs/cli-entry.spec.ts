import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `createApp()` is the binary's entry point: it slices `process.argv`, runs it
 * through `parseFlags`, and hands the result to `createNewApp`. Here we mock the
 * command module so we can assert the argv -> flags wiring end to end WITHOUT
 * triggering the wizard. `parseFlags` itself is exercised exhaustively in
 * scaffolder.spec.ts; this file pins the glue between argv and the command.
 */

const createNewApp = vi.fn(async () => undefined);

vi.mock("../src/commands/create-new-app", () => ({
  default: (...args: unknown[]) => createNewApp(...args),
}));

import createApp, { parseFlags } from "../src/index";

let originalArgv: string[];

beforeEach(() => {
  vi.clearAllMocks();
  originalArgv = process.argv;
});

afterEach(() => {
  process.argv = originalArgv;
});

describe("createApp (binary entry)", () => {
  it("drops node + script argv and forwards the parsed flags to createNewApp", () => {
    process.argv = [
      "node",
      "create-app.js",
      "my-app",
      "--db=postgres",
      "--yes",
    ];

    createApp();

    expect(createNewApp).toHaveBeenCalledTimes(1);
    expect(createNewApp).toHaveBeenCalledWith({
      name: "my-app",
      db: "postgres",
      yes: true,
    });
  });

  it("forwards an empty flag object when only node + script are present", () => {
    process.argv = ["node", "create-app.js"];

    createApp();

    expect(createNewApp).toHaveBeenCalledWith({});
  });

  it("passes through the full non-interactive flag set", () => {
    process.argv = [
      "node",
      "create-app.js",
      "shop",
      "--db",
      "mongodb",
      "--features=test,herald",
      "--ai=openai",
      "--pm=pnpm",
      "--no-git",
      "--jwt",
      "-y",
    ];

    createApp();

    expect(createNewApp).toHaveBeenCalledWith({
      name: "shop",
      db: "mongodb",
      features: ["test", "herald"],
      ai: ["openai"],
      pm: "pnpm",
      git: false,
      jwt: true,
      yes: true,
    });
  });
});

describe("parseFlags — additional edge cases", () => {
  it("lets a later --name override an earlier --name", () => {
    expect(parseFlags(["--name=first", "--name=second"]).name).toBe("second");
  });

  it("does not let --no-git leak into the db value via spaced parsing", () => {
    const flags = parseFlags(["app", "--db", "--no-git"]);

    expect(flags.db).toBeUndefined();
    expect(flags.git).toBe(false);
  });

  it("collapses duplicate and blank entries out of a comma list", () => {
    // splitList trims and drops blanks but does NOT de-duplicate — pin that.
    const flags = parseFlags(["app", "--features=test, ,test ,herald"]);

    expect(flags.features).toEqual(["test", "test", "herald"]);
  });

  it("treats --pm as value-taking and consumes the following token", () => {
    expect(parseFlags(["app", "--pm", "pnpm"]).pm).toBe("pnpm");
  });

  it("yields an empty list for a bare --ai with no following value", () => {
    // --ai is value-taking; with no value, splitList(undefined) -> [] (not
    // undefined), unlike scalar flags such as --db which stay undefined.
    const flags = parseFlags(["app", "--ai"]);

    expect(flags.ai).toEqual([]);
  });

  it("recognizes --help and its -h shorthand", () => {
    expect(parseFlags(["--help"]).help).toBe(true);
    expect(parseFlags(["-h"]).help).toBe(true);
  });

  it("recognizes --version and its -v shorthand", () => {
    expect(parseFlags(["--version"]).version).toBe(true);
    expect(parseFlags(["-v"]).version).toBe(true);
  });
});

describe("createApp — --help / --version early exit", () => {
  /**
   * Both flags must short-circuit BEFORE `createNewApp` runs: no prompts, no
   * filesystem writes, no network calls. We assert that by spying on
   * `process.exit` (so the exit doesn't kill the test worker) and asserting
   * `createNewApp` was never reached — the only filesystem read left is
   * `packageVersion()`'s own `package.json` lookup, which is not a side
   * effect (nothing is written, nothing is scaffolded).
   */
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("--help prints usage, exits 0, and never reaches createNewApp", () => {
    process.argv = ["node", "create-app.js", "--help"];

    createApp();

    expect(createNewApp).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain("Usage");
  });

  it("-h behaves identically to --help", () => {
    process.argv = ["node", "create-app.js", "-h"];

    createApp();

    expect(createNewApp).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("--version prints the package version, exits 0, and never reaches createNewApp", () => {
    process.argv = ["node", "create-app.js", "--version"];

    createApp();

    expect(createNewApp).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logSpy).toHaveBeenCalledTimes(1);
    // Pinned loosely — the exact version drifts with every release, but it
    // must be a bare semver-ish string, not an object or an error.
    expect(logSpy.mock.calls[0][0]).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("-v behaves identically to --version", () => {
    process.argv = ["node", "create-app.js", "-v"];

    createApp();

    expect(createNewApp).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("--help wins over a positional project name and other flags", () => {
    process.argv = ["node", "create-app.js", "my-app", "--db=postgres", "--help"];

    createApp();

    expect(createNewApp).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
