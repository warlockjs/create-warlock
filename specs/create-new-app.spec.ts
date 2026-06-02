import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { App } from "../src/helpers/app";

/**
 * End-to-end coverage of the scaffolder's command entry (`createNewApp`) with
 * every side-effecting collaborator mocked: the @clack prompts, the package
 * manager probes, the app path reservation, and crucially `createWarlockApp`
 * (the real installer) so NOTHING spawns a process or touches the disk.
 *
 * The strategy: each prompt mock pulls its next answer from a queue the test
 * primes, mirroring a user clicking through the wizard. `isCancel` recognises a
 * single shared sentinel so cancellation can be injected at any step.
 */

const CANCEL = Symbol("clack.cancel");

// --- @clack/prompts ----------------------------------------------------------
const text = vi.fn();
const select = vi.fn();
const multiselect = vi.fn();
const confirm = vi.fn();
const cancel = vi.fn();

vi.mock("@clack/prompts", () => ({
  text: (...args: unknown[]) => text(...args),
  select: (...args: unknown[]) => select(...args),
  multiselect: (...args: unknown[]) => multiselect(...args),
  confirm: (...args: unknown[]) => confirm(...args),
  cancel: (...args: unknown[]) => cancel(...args),
  isCancel: (value: unknown) => value === CANCEL,
  // spinner/log are pulled in transitively by create-warlock-app, but that
  // module is mocked below, so these are only here for completeness.
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
  log: { error: vi.fn() },
}));

// --- @warlock.js/fs (version read) ------------------------------------------
vi.mock("@warlock.js/fs", () => ({
  getJsonFile: () => ({ version: "9.9.9" }),
}));

// --- banner (silence the ASCII art) -----------------------------------------
vi.mock("../src/ui/banner", () => ({
  showIntroBanner: vi.fn(),
}));

// --- package manager ---------------------------------------------------------
const detectPackageManagers = vi.fn(async () => undefined);
const getSystemPackageManagers = vi.fn(() => ["npm", "yarn", "pnpm"]);
const getPreferredPackageManager = vi.fn(() => "yarn");
const setPackageManager = vi.fn();
const getPackageManager = vi.fn(() => "yarn");

vi.mock("../src/helpers/package-manager", () => ({
  detectPackageManagers: (...args: unknown[]) => detectPackageManagers(...args),
  getSystemPackageManagers: (...args: unknown[]) =>
    getSystemPackageManagers(...args),
  getPreferredPackageManager: (...args: unknown[]) =>
    getPreferredPackageManager(...args),
  setPackageManager: (...args: unknown[]) => setPackageManager(...args),
  getPackageManager: (...args: unknown[]) => getPackageManager(...args),
}));

// --- app path reservation ----------------------------------------------------
const getAppPath = vi.fn(() => "/tmp/reserved-app");

vi.mock("../src/commands/create-new-app/get-app-path", () => ({
  default: (...args: unknown[]) => getAppPath(...args),
}));

// --- the installer we must NEVER actually run -------------------------------
const createWarlockApp = vi.fn(async () => undefined);

vi.mock("../src/commands/create-warlock-app", () => ({
  createWarlockApp: (...args: unknown[]) => createWarlockApp(...args),
}));

import createNewApp from "../src/commands/create-new-app";

class ProcessExit extends Error {
  public constructor(public code?: number) {
    super(`process.exit(${code})`);
  }
}

let exitSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;

/**
 * Read the `App` descriptor that was handed to the (mocked) installer so tests
 * can assert on the assembled selections.
 */
function capturedApp(): App {
  expect(createWarlockApp).toHaveBeenCalledTimes(1);
  return createWarlockApp.mock.calls[0][0] as App;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-seed the defaults the mocks lost on clear.
  getSystemPackageManagers.mockReturnValue(["npm", "yarn", "pnpm"]);
  getPreferredPackageManager.mockReturnValue("yarn");
  getPackageManager.mockReturnValue("yarn");
  getAppPath.mockReturnValue("/tmp/reserved-app");
  detectPackageManagers.mockResolvedValue(undefined);
  createWarlockApp.mockResolvedValue(undefined);

  exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
    throw new ProcessExit(code);
  });
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  exitSpy.mockRestore();
  logSpy.mockRestore();
});

/**
 * Prime the six interactive prompts (name, pm, db, features, ai, git, jwt) with
 * happy-path answers. Overrides replace individual steps.
 */
function primeHappyPath(
  overrides: {
    name?: unknown;
    pm?: unknown;
    db?: unknown;
    features?: unknown;
    ai?: unknown;
    git?: unknown;
    jwt?: unknown;
  } = {},
) {
  text.mockResolvedValueOnce(overrides.name ?? "my-warlock-app");
  select
    .mockResolvedValueOnce(overrides.pm ?? "yarn") // package manager
    .mockResolvedValueOnce(overrides.db ?? "postgres"); // database driver
  multiselect
    .mockResolvedValueOnce(overrides.features ?? ["test"]) // features
    .mockResolvedValueOnce(overrides.ai ?? ["openai"]); // ai providers
  confirm
    .mockResolvedValueOnce(overrides.git ?? true) // git
    .mockResolvedValueOnce(overrides.jwt ?? true); // jwt
}

describe("createNewApp — preamble guards", () => {
  it("shows the intro banner with the version read from package.json", async () => {
    primeHappyPath();

    await createNewApp({});

    const { showIntroBanner } = await import("../src/ui/banner");
    expect(showIntroBanner).toHaveBeenCalledWith("9.9.9");
  });

  it("refuses to run on Node older than 20 and exits 0", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      process.versions,
      "node",
    );
    Object.defineProperty(process.versions, "node", {
      value: "18.20.0",
      configurable: true,
    });

    try {
      await expect(createNewApp({ yes: true, name: "app" })).rejects.toThrow(
        ProcessExit,
      );
      expect(cancel).toHaveBeenCalledWith(
        "Node.js version must be at least 20.0.0",
      );
      // The guard precedes the non-interactive branch, so nothing is built.
      expect(createWarlockApp).not.toHaveBeenCalled();
    } finally {
      if (descriptor) {
        Object.defineProperty(process.versions, "node", descriptor);
      }
    }
  });
});

describe("createNewApp — interactive flow", () => {
  it("assembles the full app descriptor from the prompt answers", async () => {
    primeHappyPath();

    await createNewApp({});

    const app = capturedApp();
    expect(app.name).toBe("my-warlock-app");
    expect(app.path).toBe("/tmp/reserved-app");
    expect(app.options.databaseDriver).toBe("postgres");
    expect(app.options.databasePort).toBe(5432);
    expect(app.options.features).toEqual(["test"]);
    expect(app.options.aiProviders).toEqual(["openai"]);
    expect(app.options.useGit).toBe(true);
    expect(app.options.useJWT).toBe(true);
  });

  it("defaults the database port to 27017 for the mongodb driver", async () => {
    primeHappyPath({ db: "mongodb" });

    await createNewApp({});

    expect(capturedApp().options.databasePort).toBe(27017);
  });

  it("commits the chosen package manager through setPackageManager", async () => {
    primeHappyPath({ pm: "pnpm" });

    await createNewApp({});

    expect(setPackageManager).toHaveBeenCalledWith("pnpm");
  });

  it("awaits package-manager detection before listing options", async () => {
    primeHappyPath();

    await createNewApp({});

    expect(detectPackageManagers).toHaveBeenCalled();
    expect(getSystemPackageManagers).toHaveBeenCalled();
  });

  it("reserves the app path from the typed project name", async () => {
    primeHappyPath({ name: "shop-api" });

    await createNewApp({});

    expect(getAppPath).toHaveBeenCalledWith("shop-api");
  });

  it("treats useGit=false / useJWT=false when the user declines", async () => {
    primeHappyPath({ git: false, jwt: false });

    await createNewApp({});

    const app = capturedApp();
    expect(app.options.useGit).toBe(false);
    expect(app.options.useJWT).toBe(false);
  });

  it("allows an empty feature and AI selection", async () => {
    primeHappyPath({ features: [], ai: [] });

    await createNewApp({});

    const app = capturedApp();
    expect(app.options.features).toEqual([]);
    expect(app.options.aiProviders).toEqual([]);
  });
});

describe("createNewApp — cancellation guards", () => {
  it("aborts when the project name is cancelled", async () => {
    text.mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({})).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith(
      "A project name is required to continue",
    );
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("aborts when the project name is blank (whitespace only)", async () => {
    text.mockResolvedValueOnce("   ");

    await expect(createNewApp({})).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith(
      "A project name is required to continue",
    );
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("stops without exiting when getAppPath returns falsy (collision already handled)", async () => {
    text.mockResolvedValueOnce("my-app");
    getAppPath.mockReturnValue(undefined as unknown as string);

    await createNewApp({});

    // getAppPath owns the exit on collision; createNewApp just returns early.
    expect(createWarlockApp).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it("aborts when the package manager step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({})).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith("Package manager selection cancelled");
    expect(setPackageManager).not.toHaveBeenCalled();
  });

  it("aborts when the database step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({})).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith("Database selection cancelled");
  });

  it("aborts when the features step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce("mongodb");
    multiselect.mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({})).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith("Feature selection cancelled");
  });

  it("aborts when the AI providers step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce("mongodb");
    multiselect.mockResolvedValueOnce(["test"]).mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({})).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith("AI provider selection cancelled");
  });

  it("known bug: a cancelled git confirm is NOT caught — it silently becomes useGit=false", async () => {
    // known bug: useGit = (await confirm()) === true runs BEFORE isCancel(useGit),
    // so the CANCEL symbol is coerced to `false` and isCancel(false) never fires.
    // The wizard therefore proceeds instead of aborting on a cancelled git prompt.
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce("mongodb");
    multiselect.mockResolvedValueOnce(["test"]).mockResolvedValueOnce([]);
    // First confirm (git) is cancelled; second confirm (jwt) falls back to the
    // default mock (undefined) -> useJWT false. No cancel guard trips.
    confirm.mockResolvedValueOnce(CANCEL);

    await createNewApp({});

    expect(cancel).not.toHaveBeenCalled();
    const app = capturedApp();
    expect(app.options.useGit).toBe(false);
    expect(app.options.useJWT).toBe(false);
  });

  it("known bug: a cancelled jwt confirm is NOT caught — it silently becomes useJWT=false", async () => {
    // known bug: same `=== true` coercion swallows the CANCEL symbol on the JWT
    // confirm, so the flow completes with useJWT=false instead of aborting.
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce("mongodb");
    multiselect.mockResolvedValueOnce(["test"]).mockResolvedValueOnce([]);
    confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(CANCEL);

    await createNewApp({});

    expect(cancel).not.toHaveBeenCalled();
    const app = capturedApp();
    expect(app.options.useGit).toBe(true);
    expect(app.options.useJWT).toBe(false);
  });

  it("treats a non-true git answer as useGit=false (only strict true enables git)", async () => {
    // confirm returns `false` -> `=== true` is false -> useGit false, no cancel.
    primeHappyPath({ git: false });

    await createNewApp({});

    expect(capturedApp().options.useGit).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
  });
});

describe("createNonInteractive (--yes)", () => {
  it("builds the descriptor straight from flags with no prompts", async () => {
    await createNewApp({
      yes: true,
      name: "flagged-app",
      db: "postgres",
      features: ["test", "herald"],
      ai: ["openai", "anthropic"],
      pm: "pnpm",
      git: true,
      jwt: true,
    });

    expect(text).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();

    const app = capturedApp();
    expect(app.name).toBe("flagged-app");
    expect(app.options.databaseDriver).toBe("postgres");
    expect(app.options.databasePort).toBe(5432);
    expect(app.options.features).toEqual(["test", "herald"]);
    expect(app.options.aiProviders).toEqual(["openai", "anthropic"]);
    expect(app.options.useGit).toBe(true);
    expect(app.options.useJWT).toBe(true);
    expect(setPackageManager).toHaveBeenCalledWith("pnpm");
  });

  it("defaults db to mongodb and git/jwt to false when flags are omitted", async () => {
    await createNewApp({ yes: true, name: "minimal" });

    const app = capturedApp();
    expect(app.options.databaseDriver).toBe("mongodb");
    expect(app.options.databasePort).toBe(27017);
    expect(app.options.features).toEqual([]);
    expect(app.options.aiProviders).toEqual([]);
    expect(app.options.useGit).toBe(false);
    expect(app.options.useJWT).toBe(false);
  });

  it("falls back to the preferred package manager when --pm is absent", async () => {
    getPreferredPackageManager.mockReturnValue("yarn");

    await createNewApp({ yes: true, name: "app" });

    expect(setPackageManager).toHaveBeenCalledWith("yarn");
  });

  it("exits 1 when --yes is given without a project name", async () => {
    await expect(createNewApp({ yes: true })).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith(
      "--yes requires a project name (first argument or --name=<name>)",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 when --yes is given with a whitespace-only name", async () => {
    await expect(createNewApp({ yes: true, name: "   " })).rejects.toThrow(
      ProcessExit,
    );
    expect(cancel).toHaveBeenCalledWith(
      "--yes requires a project name (first argument or --name=<name>)",
    );
  });

  it("exits 1 on an unknown database driver", async () => {
    await expect(
      createNewApp({ yes: true, name: "app", db: "oracle" }),
    ).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith('Unknown database driver "oracle"');
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("exits 1 listing every unknown feature / provider key", async () => {
    await expect(
      createNewApp({
        yes: true,
        name: "app",
        features: ["test", "bogus"],
        ai: ["openai", "nope"],
      }),
    ).rejects.toThrow(ProcessExit);

    expect(cancel).toHaveBeenCalledTimes(1);
    const message = String(cancel.mock.calls[0][0]);
    expect(message).toContain("bogus");
    expect(message).toContain("nope");
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("accepts the full known feature + provider set without complaint", async () => {
    await createNewApp({
      yes: true,
      name: "app",
      features: ["react", "test", "redis", "swagger"],
      ai: ["openai", "google", "anthropic", "bedrock", "ollama"],
    });

    expect(cancel).not.toHaveBeenCalled();
    expect(createWarlockApp).toHaveBeenCalledTimes(1);
  });

  it("returns early (no exit) when getAppPath yields falsy in non-interactive mode", async () => {
    getAppPath.mockReturnValue(undefined as unknown as string);

    await createNewApp({ yes: true, name: "app" });

    // getAppPath returns falsy AFTER the top-level detection kicks off but BEFORE
    // the package manager is committed, so the installer never runs and no
    // package manager is set.
    expect(createWarlockApp).not.toHaveBeenCalled();
    expect(setPackageManager).not.toHaveBeenCalled();
  });

  it("routes through createNonInteractive and never touches the prompt fns", async () => {
    await createNewApp({ yes: true, name: "app", db: "mongodb" });

    expect(text).not.toHaveBeenCalled();
    expect(multiselect).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(createWarlockApp).toHaveBeenCalledTimes(1);
  });
});
