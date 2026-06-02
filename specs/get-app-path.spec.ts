import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const directoryExists = vi.fn();

vi.mock("@warlock.js/fs", () => ({
  directoryExists: (...args: unknown[]) => directoryExists(...args),
}));

import getAppPath from "../src/commands/create-new-app/get-app-path";

/**
 * `process.exit` is replaced with a throwing stub so the early-return guard can
 * be observed without tearing down the test worker. Each test that expects the
 * guard asserts on the thrown sentinel.
 */
class ProcessExit extends Error {
  public constructor(public code?: number) {
    super(`process.exit(${code})`);
  }
}

let exitSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
    throw new ProcessExit(code);
  });
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  exitSpy.mockRestore();
  logSpy.mockRestore();
});

describe("getAppPath", () => {
  it("resolves the app name against the current working directory", () => {
    directoryExists.mockReturnValue(false);

    const resolved = getAppPath("fresh-app");

    expect(resolved).toBe(path.resolve(process.cwd(), "fresh-app"));
    expect(directoryExists).toHaveBeenCalledWith(
      path.resolve(process.cwd(), "fresh-app"),
    );
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits with code 1 when the target directory already exists", () => {
    directoryExists.mockReturnValue(true);

    expect(() => getAppPath("taken")).toThrow(ProcessExit);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("warns the user about the collision before exiting", () => {
    directoryExists.mockReturnValue(true);

    try {
      getAppPath("taken");
    } catch {
      // swallow the simulated exit
    }

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = String(logSpy.mock.calls[0][0]);
    expect(message).toContain("taken");
    expect(message).toContain("existing directory");
  });

  it("passes an absolute path to directoryExists even for a nested name", () => {
    directoryExists.mockReturnValue(false);

    const resolved = getAppPath(path.join("nested", "app"));

    expect(path.isAbsolute(resolved)).toBe(true);
    expect(resolved).toBe(path.resolve(process.cwd(), "nested", "app"));
  });
});
