import { beforeEach, describe, expect, it, vi } from "vitest";

import type { App } from "../src/helpers/app";
import type { AppOptions } from "../src/commands/create-new-app/types";

/**
 * `createWarlockApp` is the orchestration that walks a freshly-built `App`
 * through copy -> install -> feature batch -> git -> jwt/cache -> success. Every
 * step is delegated to the `App` instance, so a hand-rolled spy double lets us
 * assert the ORDER and the BRANCHES without spawning a single process.
 *
 * Spinners, the package-manager helpers, and the success banner are mocked so
 * the test stays silent and side-effect free.
 */

const spinnerStart = vi.fn();
const spinnerStop = vi.fn();

vi.mock("@clack/prompts", () => ({
  spinner: () => ({ start: spinnerStart, stop: spinnerStop }),
}));

const getPackageManager = vi.fn(() => "yarn");
const runPackageManagerCommand = vi.fn((command: string) => `yarn ${command}`);

vi.mock("../src/helpers/package-manager", () => ({
  getPackageManager: (...args: unknown[]) => getPackageManager(...args),
  runPackageManagerCommand: (...args: unknown[]) =>
    runPackageManagerCommand(...args),
}));

const showSuccessScreen = vi.fn();

vi.mock("../src/ui/banner", () => ({
  showSuccessScreen: (...args: unknown[]) => showSuccessScreen(...args),
}));

import { createWarlockApp } from "../src/commands/create-warlock-app";

/**
 * A spy double for `App` exposing only the surface `createWarlockApp` touches.
 * `init/use/...` are chainable (return `this`); `install()` returns the
 * `{ install: Promise<boolean> }` handle the orchestrator awaits.
 */
function makeFakeApp(
  options: Partial<AppOptions> = {},
  hooks: {
    installFeaturesResult?: boolean;
  } = {},
) {
  const resolvedOptions: AppOptions = {
    databaseDriver: "mongodb",
    databasePort: 27017,
    features: [],
    aiProviders: [],
    useGit: false,
    useJWT: false,
    ...options,
  };

  const fake = {
    options: resolvedOptions,
    name: "my-warlock-app",
    init: vi.fn(function (this: unknown) {
      return this;
    }),
    use: vi.fn(function (this: unknown) {
      return this;
    }),
    updatePackageJson: vi.fn(function (this: unknown) {
      return this;
    }),
    updateDotEnv: vi.fn(function (this: unknown) {
      return this;
    }),
    configureDatabaseEnv: vi.fn(function (this: unknown) {
      return this;
    }),
    configureHomePage: vi.fn(function (this: unknown) {
      return this;
    }),
    install: vi.fn(() => ({
      abort: vi.fn(),
      install: Promise.resolve(true),
    })),
    installFeatures: vi.fn(async () => hooks.installFeaturesResult ?? true),
    git: vi.fn(async () => true),
    exec: vi.fn(async () => true),
  };

  return fake;
}

function run(fake: ReturnType<typeof makeFakeApp>) {
  return createWarlockApp(fake as unknown as App);
}

beforeEach(() => {
  vi.clearAllMocks();
  getPackageManager.mockReturnValue("yarn");
  runPackageManagerCommand.mockImplementation(
    (command: string) => `yarn ${command}`,
  );
});

describe("createWarlockApp — template + base install", () => {
  it("runs the copy chain in order before the base install", async () => {
    const fake = makeFakeApp();

    await run(fake);

    expect(fake.init).toHaveBeenCalledTimes(1);
    expect(fake.use).toHaveBeenCalledWith("warlock");
    expect(fake.updatePackageJson).toHaveBeenCalledTimes(1);
    expect(fake.updateDotEnv).toHaveBeenCalledTimes(1);
    expect(fake.configureDatabaseEnv).toHaveBeenCalledWith("mongodb");
  });

  it("invokes the base install at least once (so the warlock binary exists)", async () => {
    const fake = makeFakeApp();

    await run(fake);

    expect(fake.install).toHaveBeenCalled();
  });
});

describe("createWarlockApp — feature batch", () => {
  it("prepends the database driver to the feature + provider batch", async () => {
    const fake = makeFakeApp({
      databaseDriver: "postgres",
      features: ["test", "redis"],
      aiProviders: ["openai"],
    });

    await run(fake);

    expect(fake.installFeatures).toHaveBeenCalledTimes(1);
    expect(fake.installFeatures).toHaveBeenCalledWith([
      "postgres",
      "test",
      "redis",
      "openai",
    ]);
  });

  it("still installs features when only the driver is present (batch never empty)", async () => {
    const fake = makeFakeApp({ features: [], aiProviders: [] });

    await run(fake);

    // The batch is [databaseDriver] -> length 1 -> the feature step always runs.
    expect(fake.installFeatures).toHaveBeenCalledWith(["mongodb"]);
  });

  it("runs a second install when the feature add succeeds", async () => {
    const fake = makeFakeApp(
      { features: ["test"] },
      { installFeaturesResult: true },
    );

    await run(fake);

    // One base install + one post-feature install = two install() calls.
    expect(fake.install).toHaveBeenCalledTimes(2);
  });

  it("skips the second install when the feature add fails", async () => {
    const fake = makeFakeApp(
      { features: ["test"] },
      { installFeaturesResult: false },
    );

    await run(fake);

    // Only the base install ran; the failed feature add short-circuits the batch
    // install so the user can retry later with `warlock add`.
    expect(fake.install).toHaveBeenCalledTimes(1);
  });
});

describe("createWarlockApp — git branch", () => {
  it("initialises git when useGit is true", async () => {
    const fake = makeFakeApp({ useGit: true });

    await run(fake);

    expect(fake.git).toHaveBeenCalledTimes(1);
  });

  it("never touches git when useGit is false", async () => {
    const fake = makeFakeApp({ useGit: false });

    await run(fake);

    expect(fake.git).not.toHaveBeenCalled();
  });
});

describe("createWarlockApp — jwt vs cache-warm branch", () => {
  it("runs the package-manager jwt script when useJWT is true", async () => {
    const fake = makeFakeApp({ useJWT: true });

    await run(fake);

    expect(runPackageManagerCommand).toHaveBeenCalledWith("jwt");
    expect(fake.exec).toHaveBeenCalledWith("yarn jwt");
  });

  it("warms the cache via npx warlock when useJWT is false", async () => {
    const fake = makeFakeApp({ useJWT: false });

    await run(fake);

    expect(fake.exec).toHaveBeenCalledWith("npx warlock --warm-cache");
    expect(runPackageManagerCommand).not.toHaveBeenCalled();
  });
});

describe("createWarlockApp — success screen", () => {
  it("labels mongodb as MongoDB and forwards features + providers", async () => {
    const fake = makeFakeApp({
      databaseDriver: "mongodb",
      features: ["test"],
      aiProviders: ["openai"],
    });

    await run(fake);

    expect(showSuccessScreen).toHaveBeenCalledTimes(1);
    expect(showSuccessScreen).toHaveBeenCalledWith({
      projectName: "my-warlock-app",
      database: "MongoDB",
      features: ["test", "openai"],
      packageManager: "yarn",
    });
  });

  it("labels any non-mongodb driver as PostgreSQL on the summary", async () => {
    const fake = makeFakeApp({ databaseDriver: "postgres" });

    await run(fake);

    const summary = showSuccessScreen.mock.calls[0][0];
    expect(summary.database).toBe("PostgreSQL");
  });

  it("reports an empty feature list to the success screen when nothing extra was picked", async () => {
    const fake = makeFakeApp({ features: [], aiProviders: [] });

    await run(fake);

    const summary = showSuccessScreen.mock.calls[0][0];
    expect(summary.features).toEqual([]);
  });
});

describe("createWarlockApp — full happy path ordering", () => {
  it("walks copy -> install -> features -> git -> jwt -> success for an all-on config", async () => {
    const fake = makeFakeApp({
      databaseDriver: "postgres",
      features: ["test"],
      aiProviders: ["openai"],
      useGit: true,
      useJWT: true,
    });

    await run(fake);

    expect(fake.use).toHaveBeenCalledWith("warlock");
    expect(fake.installFeatures).toHaveBeenCalledWith([
      "postgres",
      "test",
      "openai",
    ]);
    expect(fake.install).toHaveBeenCalledTimes(2);
    expect(fake.git).toHaveBeenCalledTimes(1);
    expect(fake.exec).toHaveBeenCalledWith("yarn jwt");
    expect(showSuccessScreen).toHaveBeenCalledTimes(1);
  });
});
