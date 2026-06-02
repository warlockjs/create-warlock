import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `package-manager.ts` keeps module-level caches (detected / preferred / system
 * managers) AND binds `promisify(exec)` at import time. To exercise the caching
 * branches cleanly each test imports a FRESH copy of the module via
 * `vi.resetModules()` + dynamic import, so no cache leaks between cases.
 *
 * `child_process.exec` is mocked as a Node-style callback so `util.promisify`
 * wraps it the same way it wraps the real binding. `execSync` throws to signal a
 * missing binary (mirroring the real "command not found" failure).
 */

type ExecCallback = (
  error: Error | null,
  result?: { stdout: string; stderr: string },
) => void;

const execMock = vi.fn((command: string, callback: ExecCallback) => {
  void command;
  callback(null, { stdout: "", stderr: "" });
});

const execSyncMock = vi.fn((command: string) => {
  void command;
  return Buffer.from("");
});

const whichPmMock = vi.fn<[], { name: string; version: string } | undefined>(
  () => undefined,
);

vi.mock("child_process", () => ({
  exec: (command: string, callback: ExecCallback) =>
    execMock(command, callback),
  execSync: (command: string) => execSyncMock(command),
}));

vi.mock("which-pm-runs", () => ({
  default: () => whichPmMock(),
}));

/**
 * Configure which binaries "exist". `installed` lists managers whose
 * `--version` probe succeeds; everything else fails (async + sync forms).
 */
function setInstalled(installed: string[]) {
  execMock.mockImplementation((command: string, callback: ExecCallback) => {
    const manager = command.split(" ")[0];
    if (installed.includes(manager)) {
      callback(null, { stdout: "1.0.0", stderr: "" });
    } else {
      callback(new Error(`command not found: ${manager}`));
    }
  });

  execSyncMock.mockImplementation((command: string) => {
    const manager = command.split(" ")[0];
    if (installed.includes(manager)) return Buffer.from("1.0.0");
    throw new Error(`command not found: ${manager}`);
  });
}

async function loadModule() {
  vi.resetModules();
  return import("../src/helpers/package-manager");
}

beforeEach(() => {
  vi.clearAllMocks();
  whichPmMock.mockReturnValue(undefined);
  setInstalled(["npm"]);
});

describe("getSystemPackageManagers (sync probe)", () => {
  it("always includes npm and appends yarn / pnpm when installed", async () => {
    setInstalled(["npm", "yarn", "pnpm"]);
    const pm = await loadModule();

    expect(pm.getSystemPackageManagers()).toEqual(["npm", "yarn", "pnpm"]);
  });

  it("omits managers whose version probe throws", async () => {
    setInstalled(["npm"]);
    const pm = await loadModule();

    expect(pm.getSystemPackageManagers()).toEqual(["npm"]);
  });

  it("includes yarn but not pnpm when only yarn is present", async () => {
    setInstalled(["npm", "yarn"]);
    const pm = await loadModule();

    expect(pm.getSystemPackageManagers()).toEqual(["npm", "yarn"]);
  });
});

describe("getPreferredPackageManager (sync probe)", () => {
  it("prefers the running package manager when it is not npm", async () => {
    whichPmMock.mockReturnValue({ name: "pnpm", version: "9.0.0" });
    setInstalled(["npm"]); // even with nothing else installed, the runner wins
    const pm = await loadModule();

    expect(pm.getPreferredPackageManager()).toBe("pnpm");
  });

  it("ignores npm as the running manager and falls through to yarn", async () => {
    whichPmMock.mockReturnValue({ name: "npm", version: "10.0.0" });
    setInstalled(["npm", "yarn"]);
    const pm = await loadModule();

    expect(pm.getPreferredPackageManager()).toBe("yarn");
  });

  it("falls back to pnpm when yarn is absent and the runner is npm", async () => {
    whichPmMock.mockReturnValue(undefined);
    setInstalled(["npm", "pnpm"]);
    const pm = await loadModule();

    expect(pm.getPreferredPackageManager()).toBe("pnpm");
  });

  it("defaults to npm when nothing else is installed or running", async () => {
    whichPmMock.mockReturnValue(undefined);
    setInstalled(["npm"]);
    const pm = await loadModule();

    expect(pm.getPreferredPackageManager()).toBe("npm");
  });
});

describe("detectPackageManagers (async probe + caching)", () => {
  it("caches the detected system managers for the sync getter", async () => {
    setInstalled(["npm", "yarn", "pnpm"]);
    const pm = await loadModule();

    await pm.detectPackageManagers();

    // After detection the sync getter returns the cached list without re-probing
    // via execSync.
    execSyncMock.mockClear();
    expect(pm.getSystemPackageManagers()).toEqual(["npm", "yarn", "pnpm"]);
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it("caches the preferred manager so the sync getter skips re-detection", async () => {
    whichPmMock.mockReturnValue(undefined);
    setInstalled(["npm", "yarn"]);
    const pm = await loadModule();

    await pm.detectPackageManagers();

    whichPmMock.mockClear();
    execSyncMock.mockClear();
    expect(pm.getPreferredPackageManager()).toBe("yarn");
    expect(whichPmMock).not.toHaveBeenCalled();
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it("prefers the running manager over installed yarn when detecting", async () => {
    whichPmMock.mockReturnValue({ name: "pnpm", version: "9.0.0" });
    setInstalled(["npm", "yarn", "pnpm"]);
    const pm = await loadModule();

    await pm.detectPackageManagers();

    expect(pm.getPreferredPackageManager()).toBe("pnpm");
  });

  it("detects only yarn when pnpm is missing (async form)", async () => {
    whichPmMock.mockReturnValue(undefined);
    setInstalled(["npm", "yarn"]);
    const pm = await loadModule();

    await pm.detectPackageManagers();

    expect(pm.getSystemPackageManagers()).toEqual(["npm", "yarn"]);
    expect(pm.getPreferredPackageManager()).toBe("yarn");
  });

  it("prefers pnpm during detection when yarn is absent and runner is npm", async () => {
    whichPmMock.mockReturnValue({ name: "npm", version: "10.0.0" });
    setInstalled(["npm", "pnpm"]);
    const pm = await loadModule();

    await pm.detectPackageManagers();

    expect(pm.getSystemPackageManagers()).toEqual(["npm", "pnpm"]);
    expect(pm.getPreferredPackageManager()).toBe("pnpm");
  });

  it("falls back to npm during detection when nothing else is installed", async () => {
    whichPmMock.mockReturnValue(undefined);
    setInstalled(["npm"]);
    const pm = await loadModule();

    await pm.detectPackageManagers();

    expect(pm.getSystemPackageManagers()).toEqual(["npm"]);
    expect(pm.getPreferredPackageManager()).toBe("npm");
  });
});

describe("setPackageManager / getPackageManager", () => {
  it("returns the explicitly set manager over any detection result", async () => {
    setInstalled(["npm", "yarn", "pnpm"]);
    const pm = await loadModule();

    pm.setPackageManager("pnpm");

    expect(pm.getPackageManager()).toBe("pnpm");
  });

  it("falls back to the preferred manager when none was set", async () => {
    whichPmMock.mockReturnValue(undefined);
    setInstalled(["npm", "yarn"]);
    const pm = await loadModule();

    // Nothing was set, so getPackageManager defers to getPreferredPackageManager.
    expect(pm.getPackageManager()).toBe("yarn");
  });
});

describe("derived command strings", () => {
  it("installCommand follows the active package manager", async () => {
    const pm = await loadModule();

    pm.setPackageManager("yarn");
    expect(pm.installCommand()).toBe("yarn install");

    pm.setPackageManager("npm");
    expect(pm.installCommand()).toBe("npm install");
  });

  it("startCommand uses `npm run dev` only for npm", async () => {
    const pm = await loadModule();

    pm.setPackageManager("npm");
    expect(pm.startCommand()).toBe("npm run dev");

    pm.setPackageManager("pnpm");
    expect(pm.startCommand()).toBe("pnpm dev");

    pm.setPackageManager("yarn");
    expect(pm.startCommand()).toBe("yarn dev");
  });

  it("runPackageManagerCommand inserts `run` only for npm scripts", async () => {
    const pm = await loadModule();

    pm.setPackageManager("npm");
    expect(pm.runPackageManagerCommand("jwt")).toBe("npm run jwt");

    pm.setPackageManager("yarn");
    expect(pm.runPackageManagerCommand("jwt")).toBe("yarn jwt");

    pm.setPackageManager("pnpm");
    expect(pm.runPackageManagerCommand("build")).toBe("pnpm build");
  });
});
