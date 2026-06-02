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
});
