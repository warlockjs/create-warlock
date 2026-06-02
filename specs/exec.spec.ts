import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * cross-spawn is a callable default export that also carries a `.sync` method.
 * exec.ts imports the default twice (`childProcess` for `.sync`, `spawn` for the
 * async form), so the mock must expose BOTH on the same default function.
 */
const spawnSync = vi.fn();
const spawnFn = vi.fn();

vi.mock("cross-spawn", () => {
  const fn = (...args: unknown[]) => spawnFn(...args);
  (fn as unknown as { sync: typeof spawnSync }).sync = (...args: unknown[]) =>
    spawnSync(...args);

  return { default: fn };
});

const logError = vi.fn();

vi.mock("@clack/prompts", () => ({
  log: { error: (...args: unknown[]) => logError(...args) },
}));

import exec, { executeCommand, runCommand } from "../src/helpers/exec";

/**
 * A minimal stand-in for a cross-spawn child: an EventEmitter that records the
 * signal passed to `kill()` so the abort path can be asserted.
 */
class FakeChild extends EventEmitter {
  public killedWith: NodeJS.Signals | number | undefined;

  public kill(signal?: NodeJS.Signals | number): boolean {
    this.killedWith = signal;
    return true;
  }
}

let exitSpy: ReturnType<typeof vi.spyOn>;

class ProcessExit extends Error {
  public constructor(public code?: number) {
    super(`process.exit(${code})`);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
    throw new ProcessExit(code);
  });
});

afterEach(() => {
  exitSpy.mockRestore();
});

describe("exec (synchronous cross-spawn)", () => {
  it("splits the command string into binary + args before spawning", async () => {
    spawnSync.mockReturnValue({ error: null });

    await exec("git status --short");

    expect(spawnSync).toHaveBeenCalledTimes(1);
    const [bin, args] = spawnSync.mock.calls[0];
    expect(bin).toBe("git");
    expect(args).toEqual(["status", "--short"]);
  });

  it("forwards the options object through to cross-spawn.sync", async () => {
    spawnSync.mockReturnValue({ error: null });

    await exec("ls", { cwd: "/tmp", stdio: "ignore" });

    const [, , options] = spawnSync.mock.calls[0];
    expect(options).toEqual({ cwd: "/tmp", stdio: "ignore" });
  });

  it("returns the raw cross-spawn result when the command succeeds", async () => {
    const result = { error: null, status: 0, stdout: Buffer.from("ok") };
    spawnSync.mockReturnValue(result);

    const output = await exec("echo ok");

    expect(output).toBe(result);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits the process when cross-spawn reports a spawn error", async () => {
    // `error` is a non-null Error -> the program must bail with exit(1).
    spawnSync.mockReturnValue({ error: new Error("ENOENT") });

    await expect(exec("nope")).rejects.toThrow(ProcessExit);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("treats an undefined error as a failure (only null means success)", async () => {
    // The guard is `commandOutput.error !== null`, so `undefined` also exits —
    // known behaviour: a missing `error` field is considered a failure.
    spawnSync.mockReturnValue({ status: 0 });

    await expect(exec("ambiguous")).rejects.toThrow(ProcessExit);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe("executeCommand (async, resolves boolean)", () => {
  it("resolves true when the child closes with code 0", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const promise = executeCommand("git", ["init"], "/repo");
    child.emit("close", 0);

    await expect(promise).resolves.toBe(true);
    expect(spawnFn).toHaveBeenCalledWith("git", ["init"], {
      cwd: "/repo",
      stdio: "ignore",
    });
  });

  it("resolves false when the child closes with a non-zero code", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const promise = executeCommand("git", ["push"], "/repo");
    child.emit("close", 128);

    await expect(promise).resolves.toBe(false);
  });

  it("resolves false and logs the error message on a spawn error", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const promise = executeCommand("missing-bin", [], "/repo");
    child.emit("error", new Error("spawn missing-bin ENOENT"));

    await expect(promise).resolves.toBe(false);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(String(logError.mock.calls[0][0])).toContain("ENOENT");
  });

  it("logs the stringified error when it carries no message", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const promise = executeCommand("x", [], "/repo");
    // An error-like value without a `.message` exercises the String(e) branch.
    child.emit("error", { toString: () => "weird-failure" });

    await expect(promise).resolves.toBe(false);
    expect(String(logError.mock.calls[0][0])).toContain("weird-failure");
  });

  it("resolves false without logging when the emitted error is falsy", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const promise = executeCommand("x", [], "/repo");
    // The handler guards `if (e)`, so a falsy error skips the log but still fails.
    child.emit("error", undefined);

    await expect(promise).resolves.toBe(false);
    expect(logError).not.toHaveBeenCalled();
  });
});

describe("runCommand (async with abort handle)", () => {
  it("returns an { abort, install } pair", () => {
    spawnFn.mockReturnValue(new FakeChild());

    const handle = runCommand("yarn", ["install"], "/app");

    expect(typeof handle.abort).toBe("function");
    expect(handle.install).toBeInstanceOf(Promise);
  });

  it("install resolves true on a clean exit", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const { install } = runCommand("yarn", ["install"], "/app");
    child.emit("close", 0);

    await expect(install).resolves.toBe(true);
  });

  it("install resolves false on a non-zero exit", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const { install } = runCommand("yarn", ["install"], "/app");
    child.emit("close", 1);

    await expect(install).resolves.toBe(false);
  });

  it("install resolves false and logs when the child errors", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const { install } = runCommand("yarn", ["install"], "/app");
    child.emit("error", new Error("EACCES"));

    await expect(install).resolves.toBe(false);
    expect(logError).toHaveBeenCalled();
  });

  it("install logs the stringified error when it carries no message", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const { install } = runCommand("yarn", ["install"], "/app");
    child.emit("error", { toString: () => "opaque-runCommand-failure" });

    await expect(install).resolves.toBe(false);
    expect(String(logError.mock.calls[0][0])).toContain(
      "opaque-runCommand-failure",
    );
  });

  it("install resolves false when spawn itself throws synchronously", async () => {
    spawnFn.mockImplementation(() => {
      throw new Error("cannot spawn");
    });

    const { install } = runCommand("yarn", ["install"], "/app");

    await expect(install).resolves.toBe(false);
  });

  it("abort sends SIGINT to the running child", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const { abort } = runCommand("yarn", ["install"], "/app");
    await abort();

    expect(child.killedWith).toBe("SIGINT");
  });

  it("install resolves false without logging when the child error is falsy", async () => {
    const child = new FakeChild();
    spawnFn.mockReturnValue(child);

    const { install } = runCommand("yarn", ["install"], "/app");
    child.emit("error", undefined);

    await expect(install).resolves.toBe(false);
    expect(logError).not.toHaveBeenCalled();
  });

  it("abort is a no-op when the child never spawned", async () => {
    spawnFn.mockImplementation(() => {
      throw new Error("cannot spawn");
    });

    const { abort, install } = runCommand("yarn", ["install"], "/app");

    // Must not throw even though no child handle exists.
    await expect(abort()).resolves.toBeUndefined();
    await expect(install).resolves.toBe(false);
  });
});
