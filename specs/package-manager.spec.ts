import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The scaffolder's own end-to-end specs mock `../src/helpers/package-manager`
 * wholesale, so NOTHING there exercises the real detectors. That is exactly
 * how `bun` reached `ALLOWED_PACKAGE_MANAGERS` and `--help` while reaching
 * neither probe: every test that could have caught it was asserting against a
 * hand-written option list.
 *
 * So these tests drive the real module and mock only `child_process`, the one
 * thing that must not run. Both detectors are covered, because the async one
 * fills the cache the sync one returns — a fix applied to only one of them is
 * dead code the moment `detectPackageManagers()` has been awaited.
 */

const execSync = vi.fn();
const exec = vi.fn();

vi.mock("child_process", () => ({
  execSync: (...args: unknown[]) => execSync(...args),
  exec: (...args: unknown[]) => exec(...args),
}));

vi.mock("which-pm-runs", () => ({
  default: () => undefined,
}));

/** Pretend these managers answer `<manager> --version`, and no others. */
function installed(...managers: string[]) {
  execSync.mockImplementation((command: string) => {
    if (managers.some(manager => command.startsWith(`${manager} `))) return "";
    throw new Error(`not found: ${command}`);
  });

  // promisify(exec) calls exec(command, callback).
  exec.mockImplementation((command: string, callback: Function) => {
    if (managers.some(manager => command.startsWith(`${manager} `))) {
      callback(null, { stdout: "", stderr: "" });
      return;
    }

    callback(new Error(`not found: ${command}`));
  });
}

/** A fresh module, because the real one caches detection results globally. */
async function freshModule() {
  vi.resetModules();
  return import("../src/helpers/package-manager");
}

beforeEach(() => {
  execSync.mockReset();
  exec.mockReset();
});

describe("package manager detection", () => {
  it("offers every allow-listed manager the machine actually has — bun included", async () => {
    installed("yarn", "pnpm", "bun");

    const pm = await freshModule();

    expect(pm.getSystemPackageManagers()).toEqual([
      "npm",
      "yarn",
      "pnpm",
      "bun",
    ]);
  });

  it("reports bun through the ASYNC detector too, which is what fills the cache", async () => {
    installed("bun");

    const pm = await freshModule();
    await pm.detectPackageManagers();

    expect(pm.getSystemPackageManagers()).toEqual(["npm", "bun"]);
  });

  it("never offers a manager the machine does not have", async () => {
    installed();

    const pm = await freshModule();
    await pm.detectPackageManagers();

    expect(pm.getSystemPackageManagers()).toEqual(["npm"]);
  });

  it("probes every allow-listed manager except npm, which is assumed present", async () => {
    installed("yarn", "pnpm", "bun");

    const pm = await freshModule();
    await pm.detectPackageManagers();

    const probed = exec.mock.calls.map(call => String(call[0]).split(" ")[0]);

    expect(new Set(probed)).toEqual(
      new Set(pm.ALLOWED_PACKAGE_MANAGERS.filter(name => name !== "npm")),
    );
  });
});
