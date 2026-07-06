import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseFlags } from "../src/index";
import { resolveNonInteractiveOptions } from "../src/commands/create-new-app";
import {
  databaseDrivers,
  getDatabaseDependency,
  getDatabaseDriver,
  getDatabaseDriverOptions,
  getDatabaseLabel,
  isNoDatabase,
  NO_DATABASE,
} from "../src/features/database-drivers";
import {
  getAiPackageOptions,
  getAiProviderOptions,
  getAllFeatureKeys,
  getDefaultFeatureKeys,
  getFeatureOptions,
} from "../src/features/features-map";
import { App } from "../src/helpers/app";
import { setPackageManager } from "../src/helpers/package-manager";
import { Application } from "../src/commands/create-new-app/types";

/**
 * Build a scaffolder `Application` descriptor pointing at a throwaway directory.
 * The directory itself must NOT exist yet — `App.use()` copies the template into
 * it, mirroring how the real flow runs after `getAppPath` reserves a fresh path.
 */
function makeApplication(
  appPath: string,
  overrides: Partial<Application["options"]> = {},
  pkgManager: string = "yarn",
): Application {
  return {
    appName: "my-warlock-app",
    appType: "warlock",
    appPath,
    pkgManager,
    options: {
      databaseDriver: "mongodb",
      databasePort: 27017,
      features: [],
      aiProviders: [],
      useGit: false,
      useJWT: false,
      ...overrides,
    },
  };
}

describe("parseFlags", () => {
  it("reads the project name from the first positional argument", () => {
    const flags = parseFlags(["my-app"]);

    expect(flags.name).toBe("my-app");
  });

  it("prefers an explicit --name over the positional", () => {
    const flags = parseFlags(["positional", "--name=explicit"]);

    expect(flags.name).toBe("explicit");
  });

  it("parses --key=value and space-separated --key value forms", () => {
    const equals = parseFlags(["app", "--db=postgres"]);
    const spaced = parseFlags(["app", "--db", "postgres"]);

    expect(equals.db).toBe("postgres");
    expect(spaced.db).toBe("postgres");
  });

  it("maps --no-db to the 'none' database sentinel", () => {
    expect(parseFlags(["app", "--no-db"]).db).toBe("none");
  });

  it("accepts --db=none (and --db none) to opt out of a database", () => {
    expect(parseFlags(["app", "--db=none"]).db).toBe("none");
    expect(parseFlags(["app", "--db", "none"]).db).toBe("none");
  });

  it("splits comma lists for --features and --ai, trimming blanks", () => {
    const flags = parseFlags(["app", "--features=test, herald ,", "--ai=openai,anthropic"]);

    expect(flags.features).toEqual(["test", "herald"]);
    expect(flags.ai).toEqual(["openai", "anthropic"]);
  });

  it("maps the boolean toggles including the negated forms", () => {
    const flags = parseFlags(["app", "--yes", "--no-git", "--jwt"]);

    expect(flags.yes).toBe(true);
    expect(flags.git).toBe(false);
    expect(flags.jwt).toBe(true);
  });

  it("treats -y as an alias for --yes", () => {
    const flags = parseFlags(["app", "-y"]);

    expect(flags.yes).toBe(true);
  });

  it("maps --no-jwt to git/jwt false independently of --no-git", () => {
    const flags = parseFlags(["app", "--no-jwt"]);

    expect(flags.jwt).toBe(false);
    expect(flags.git).toBeUndefined();
  });

  it("keeps the first positional when several are given", () => {
    const flags = parseFlags(["first", "second", "third"]);

    expect(flags.name).toBe("first");
  });

  it("reads the --pm flag in both equals and spaced forms", () => {
    expect(parseFlags(["app", "--pm=pnpm"]).pm).toBe("pnpm");
    expect(parseFlags(["app", "--pm", "pnpm"]).pm).toBe("pnpm");
  });

  it("ignores flags it does not recognise without throwing", () => {
    const flags = parseFlags(["app", "--totally-unknown", "--db=postgres"]);

    expect(flags.db).toBe("postgres");
    expect(flags.name).toBe("app");
  });

  it("leaves a value flag undefined when it is the final token with no value", () => {
    const flags = parseFlags(["app", "--db"]);

    expect(flags.db).toBeUndefined();
  });

  it("does not consume the next flag as a spaced value", () => {
    // `--db` is value-taking but the following token is itself a flag, so it
    // must NOT be swallowed as the db value.
    const flags = parseFlags(["app", "--db", "--jwt"]);

    expect(flags.db).toBeUndefined();
    expect(flags.jwt).toBe(true);
  });

  it("yields an empty list for --features= with an empty value", () => {
    const flags = parseFlags(["app", "--features="]);

    expect(flags.features).toEqual([]);
  });

  it("returns no name when only flags are passed", () => {
    const flags = parseFlags(["--yes", "--db=mongodb"]);

    expect(flags.name).toBeUndefined();
    expect(flags.yes).toBe(true);
  });

  it("returns an empty object for empty argv", () => {
    expect(parseFlags([])).toEqual({});
  });
});

describe("database drivers", () => {
  it("resolves a known driver with its default port", () => {
    expect(getDatabaseDriver("postgres")?.defaultPort).toBe(5432);
    expect(getDatabaseDriver("mongodb")?.defaultPort).toBe(27017);
  });

  it("returns undefined for an unknown driver", () => {
    expect(getDatabaseDriver("oracle")).toBeUndefined();
  });

  it("exposes select options that carry the disabled flag for coming-soon drivers", () => {
    const options = getDatabaseDriverOptions();
    const mysql = options.find((option) => option.value === "mysql");

    expect(mysql?.disabled).toBe(true);
  });

  it("leaves the shippable drivers enabled (no disabled flag)", () => {
    const options = getDatabaseDriverOptions();
    const mongodb = options.find((option) => option.value === "mongodb");
    const postgres = options.find((option) => option.value === "postgres");

    expect(mongodb?.disabled).toBeUndefined();
    expect(postgres?.disabled).toBeUndefined();
  });

  it("returns one option per registered driver plus a None opt-out", () => {
    expect(getDatabaseDriverOptions()).toHaveLength(databaseDrivers.length + 1);
  });

  it("appends a None opt-out as the last option, enabled and hinted", () => {
    const options = getDatabaseDriverOptions();
    const last = options[options.length - 1];

    expect(last.value).toBe(NO_DATABASE);
    expect(last.label).toBe("None");
    expect(last.disabled).toBeUndefined();
    expect(last.hint).toBeTruthy();
  });

  it("recognises the no-database sentinel", () => {
    expect(isNoDatabase(NO_DATABASE)).toBe(true);
    expect(isNoDatabase("none")).toBe(true);
    expect(isNoDatabase("mongodb")).toBe(false);
    expect(isNoDatabase(undefined)).toBe(false);
  });

  it("labels the database for the success screen", () => {
    expect(getDatabaseLabel("mongodb")).toBe("MongoDB");
    expect(getDatabaseLabel("postgres")).toBe("PostgreSQL");
    expect(getDatabaseLabel(NO_DATABASE)).toBe("None");
    // Unknown driver falls back to the raw value rather than throwing.
    expect(getDatabaseLabel("oracle")).toBe("oracle");
  });

  it("maps a known driver to its single package -> version dependency", () => {
    expect(getDatabaseDependency("postgres")).toEqual({ pg: "^8.11.0" });
    expect(getDatabaseDependency("mongodb")).toEqual({ mongodb: "^7.0.0" });
  });

  it("returns an empty dependency map for an unknown driver", () => {
    expect(getDatabaseDependency("oracle")).toEqual({});
  });

  it("keeps the dependency map in lockstep with the driver's declared package", () => {
    for (const driver of databaseDrivers) {
      expect(getDatabaseDependency(driver.value)).toEqual({
        [driver.package]: driver.packageVersion,
      });
    }
  });
});

describe("resolveNonInteractiveOptions", () => {
  it("defaults to mongodb on port 27017 with no features when given empty flags", () => {
    const options = resolveNonInteractiveOptions({});

    expect(options.databaseDriver).toBe("mongodb");
    expect(options.databasePort).toBe(27017);
    expect(options.features).toEqual([]);
    expect(options.aiProviders).toEqual([]);
    expect(options.useGit).toBe(false);
    expect(options.useJWT).toBe(false);
  });

  it("resolves an explicit driver to its default port", () => {
    const options = resolveNonInteractiveOptions({ db: "postgres" });

    expect(options.databaseDriver).toBe("postgres");
    expect(options.databasePort).toBe(5432);
  });

  it("accepts the 'none' database with a harmless fallback port", () => {
    const options = resolveNonInteractiveOptions({ db: NO_DATABASE });

    expect(options.databaseDriver).toBe(NO_DATABASE);
    expect(options.databasePort).toBe(27017);
  });

  it("throws on an unknown database driver so the run fails fast", () => {
    expect(() => resolveNonInteractiveOptions({ db: "oracle" })).toThrow(
      /Unknown database driver "oracle"/,
    );
  });

  it("throws on an unknown feature or ai key", () => {
    expect(() =>
      resolveNonInteractiveOptions({ features: ["test", "bogus"] }),
    ).toThrow(/Unknown feature\(s\): bogus/);

    expect(() => resolveNonInteractiveOptions({ ai: ["ai-openai", "nope"] })).toThrow(
      /nope/,
    );
  });

  it("passes through valid features, ai providers, and the git/jwt toggles", () => {
    const options = resolveNonInteractiveOptions({
      db: "postgres",
      features: ["test", "redis"],
      ai: ["ai-openai"],
      git: true,
      jwt: true,
    });

    expect(options.features).toEqual(["test", "redis"]);
    expect(options.aiProviders).toEqual(["ai-openai"]);
    expect(options.useGit).toBe(true);
    expect(options.useJWT).toBe(true);
  });
});

describe("features map", () => {
  it("pre-selects only the default features", () => {
    const defaults = getDefaultFeatureKeys();

    expect(defaults).toContain("react");
    expect(defaults).not.toContain("redis");
  });

  it("never lists ai or a database driver as a standalone feature", () => {
    const options = getFeatureOptions().map((option) => option.value);

    expect(options).not.toContain("ai");
    expect(options).not.toContain("mongodb");
    expect(options).not.toContain("postgres");
  });

  it("includes every feature and ai provider/package key in the allow-list used to validate flags", () => {
    const keys = getAllFeatureKeys();

    expect(keys).toContain("test");
    expect(keys).toContain("ai-openai");
    expect(keys).toContain("ai-anthropic");
    expect(keys).toContain("ai-tools");
  });

  it("merges feature keys and ai provider/package keys with no duplicates", () => {
    const featureValues = getFeatureOptions().map((option) => option.value);
    const aiValues = getAiProviderOptions().map((option) => option.value);
    const aiPackageValues = getAiPackageOptions().map((option) => option.value);
    const allKeys = getAllFeatureKeys();

    expect(allKeys).toEqual([...featureValues, ...aiValues, ...aiPackageValues]);
    expect(new Set(allKeys).size).toBe(allKeys.length);
  });

  it("surfaces the group name inside each feature option hint", () => {
    const react = getFeatureOptions().find((option) => option.value === "react");

    // getFeatureOptions folds the group into the hint as `${group} — ${hint}`.
    expect(react?.hint).toContain("Rendering & Mail");
    expect(react?.hint).toContain("—");
  });

  it("lists every shipped ai provider with a label and hint", () => {
    const options = getAiProviderOptions();
    const values = options.map((option) => option.value);

    expect(values).toEqual([
      "ai-openai",
      "ai-google",
      "ai-anthropic",
      "ai-bedrock",
      "ai-ollama",
    ]);

    for (const option of options) {
      expect(option.label).toBeTruthy();
      expect(option.hint).toBeTruthy();
    }
  });

  it("lists the ai capability packages with a label and hint", () => {
    const options = getAiPackageOptions();
    const values = options.map((option) => option.value);

    expect(values).toEqual(["ai-tools", "ai-panoptic", "ai-workspace"]);

    for (const option of options) {
      expect(option.label).toBeTruthy();
      expect(option.hint).toBeTruthy();
    }
  });

  it("never marks ai providers as default-selected (only the general step pre-checks)", () => {
    const aiValues = getAiProviderOptions().map((option) => option.value);
    const defaults = getDefaultFeatureKeys();

    for (const aiValue of aiValues) {
      expect(defaults).not.toContain(aiValue);
    }
  });

  it("gives every feature option a non-empty value and label", () => {
    for (const option of getFeatureOptions()) {
      expect(option.value).toBeTruthy();
      expect(option.label).toBeTruthy();
    }
  });
});

describe("App template emission", () => {
  let workdir: string;
  let appPath: string;

  beforeEach(() => {
    setPackageManager("yarn");
    workdir = mkdtempSync(path.join(tmpdir(), "create-warlock-"));
    appPath = path.join(workdir, "generated-app");
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it("copies the template tree and renames _.gitignore to .gitignore", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock");

    expect(existsSync(path.join(appPath, "package.json"))).toBe(true);
    expect(existsSync(path.join(appPath, "warlock.config.ts"))).toBe(true);
    expect(existsSync(path.join(appPath, "src/app/users/models/user/user.model.ts"))).toBe(true);
    expect(existsSync(path.join(appPath, ".gitignore"))).toBe(true);
    expect(existsSync(path.join(appPath, "_.gitignore"))).toBe(false);
  });

  it("creates a .env from .env.example during use()", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock");

    expect(existsSync(path.join(appPath, ".env"))).toBe(true);
  });

  it("substitutes the project name into package.json and .env", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock").updatePackageJson().updateDotEnv();

    const packageJson = JSON.parse(readFileSync(path.join(appPath, "package.json"), "utf8"));
    const env = readFileSync(path.join(appPath, ".env"), "utf8");

    expect(packageJson.name).toBe("my-warlock-app");
    expect(env).toContain('APP_NAME="my-warlock-app"');
    expect(env).toContain("DB_NAME=my-warlock-app");
    expect(env).not.toContain("appName");
  });

  it("wires the selected database driver port and value into .env", () => {
    const app = new App(makeApplication(appPath, { databaseDriver: "postgres" }));

    app.use("warlock").updateDotEnv().configureDatabaseEnv("postgres");

    const env = readFileSync(path.join(appPath, ".env"), "utf8");

    expect(env).toContain("DB_PORT=5432");
    expect(env).toContain("DB_DRIVER=postgres");
  });

  it("keeps the MongoDB default port when MongoDB is selected", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock").configureDatabaseEnv("mongodb");

    const env = readFileSync(path.join(appPath, ".env"), "utf8");

    expect(env).toContain("DB_PORT=27017");
  });

  it("slashes in scoped project names are flattened in package.json name", () => {
    const app = new App(makeApplication(appPath, {}));

    // emulate a scoped name like "@acme/store"
    (app as unknown as { app: Application }).app.appName = "@acme/store";

    app.use("warlock").updatePackageJson();

    const packageJson = JSON.parse(readFileSync(path.join(appPath, "package.json"), "utf8"));

    expect(packageJson.name).toBe("@acme-store");
  });

  it("copies the full module tree across users, posts, auth, uploads and config", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock");

    const expectedFiles = [
      "warlock.config.ts",
      "tsconfig.json",
      "eslint.config.js",
      "src/app/users/models/user/user.model.ts",
      "src/app/users/controllers/create-new-user.controller.ts",
      "src/app/users/resources/user.resource.ts",
      "src/app/posts/models/post/post.model.ts",
      "src/app/posts/resources/post.resource.ts",
      "src/app/auth/models/otp/otp.model.ts",
      "src/app/auth/routes.ts",
      "src/app/uploads/routes.ts",
      "src/app/shared/utils/router.ts",
      "src/config/database.ts",
      "src/config/app.ts",
    ];

    for (const file of expectedFiles) {
      expect(existsSync(path.join(appPath, file))).toBe(true);
    }
  });

  it("removeDatabaseConfig deletes src/config/database.ts but keeps its siblings", () => {
    const app = new App(makeApplication(appPath, { databaseDriver: NO_DATABASE }));

    app.use("warlock");

    // The template always ships the DB config; removal is a scaffold-time step.
    expect(existsSync(path.join(appPath, "src/config/database.ts"))).toBe(true);

    app.removeDatabaseConfig();

    expect(existsSync(path.join(appPath, "src/config/database.ts"))).toBe(false);
    // Sibling config files are untouched.
    expect(existsSync(path.join(appPath, "src/config/app.ts"))).toBe(true);
    expect(existsSync(path.join(appPath, "src/config/cache.ts"))).toBe(true);
  });

  it("removeDatabaseConfig is chainable and a no-op when the file is already gone", () => {
    const app = new App(makeApplication(appPath, { databaseDriver: NO_DATABASE }));

    app.use("warlock");

    expect(app.removeDatabaseConfig()).toBe(app);
    // Second call: the file is already gone — it must not throw.
    expect(() => app.removeDatabaseConfig()).not.toThrow();
    expect(existsSync(path.join(appPath, "src/config/database.ts"))).toBe(false);
  });

  it("preserves dotfiles and nested hidden directories from the template", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock");

    // copyDirectory is cpSync({ recursive: true }) so dotfiles must survive.
    expect(existsSync(path.join(appPath, ".prettierrc.json"))).toBe(true);
    expect(existsSync(path.join(appPath, ".gitattributes"))).toBe(true);
    expect(existsSync(path.join(appPath, ".vscode/settings.json"))).toBe(true);
    expect(existsSync(path.join(appPath, ".husky/pre-commit"))).toBe(true);
    // .env.example is the source for .env and is left in place after copying.
    expect(existsSync(path.join(appPath, ".env.example"))).toBe(true);
  });

  it("returns the same App instance from every fluent step (chainable)", () => {
    const app = new App(makeApplication(appPath));

    expect(app.init()).toBe(app);
    expect(app.use("warlock")).toBe(app);
    expect(app.updatePackageJson()).toBe(app);
    expect(app.updateDotEnv()).toBe(app);
    expect(app.configureDatabaseEnv("mongodb")).toBe(app);
  });

  it("rewrites the template's yarn scripts to the chosen package manager", () => {
    setPackageManager("pnpm");
    const app = new App(makeApplication(appPath, {}, "pnpm"));

    app.use("warlock").updatePackageJson();

    const packageJson = JSON.parse(readFileSync(path.join(appPath, "package.json"), "utf8"));

    // The template's `serve` script shells out to `yarn build` — it must follow
    // the selected package manager after updatePackageJson().
    expect(packageJson.scripts.serve).toContain("pnpm build");
    expect(packageJson.scripts.serve).not.toContain("yarn build");
  });

  it("preserves package.json structural fields while substituting the name", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock").updatePackageJson();

    const packageJson = JSON.parse(readFileSync(path.join(appPath, "package.json"), "utf8"));

    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe("module");
    expect(packageJson.scripts.dev).toBe("warlock dev");
    expect(packageJson.dependencies["@warlock.js/core"]).toBeTruthy();
  });

  it("adds DB_DRIVER=mongodb when MongoDB is selected and the line is absent", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock").configureDatabaseEnv("mongodb");

    const env = readFileSync(path.join(appPath, ".env"), "utf8");

    // .env.example ships without a DB_DRIVER line, so it is inserted after DB_PORT.
    expect(env).toContain("DB_DRIVER=mongodb");
    expect(env).toMatch(/DB_PORT=27017\nDB_DRIVER=mongodb/);
  });

  it("leaves .env untouched for an unknown driver", () => {
    const app = new App(makeApplication(appPath));
    app.use("warlock");

    const before = readFileSync(path.join(appPath, ".env"), "utf8");
    app.configureDatabaseEnv("oracle");
    const after = readFileSync(path.join(appPath, ".env"), "utf8");

    expect(after).toBe(before);
    expect(after).not.toContain("DB_DRIVER=oracle");
  });

  it("is idempotent: re-running configureDatabaseEnv keeps a single correct driver", () => {
    const app = new App(makeApplication(appPath, { databaseDriver: "postgres" }));

    app
      .use("warlock")
      .configureDatabaseEnv("postgres")
      .configureDatabaseEnv("postgres");

    const env = readFileSync(path.join(appPath, ".env"), "utf8");
    const driverLines = env.match(/DB_DRIVER=/g) ?? [];

    expect(driverLines).toHaveLength(1);
    expect(env).toContain("DB_DRIVER=postgres");
    expect(env).toContain("DB_PORT=5432");
  });

  it("switches the driver in place when configureDatabaseEnv is called again with a new driver", () => {
    const app = new App(makeApplication(appPath));

    // First wire mongodb (inserts the line), then switch to postgres (rewrites it).
    app
      .use("warlock")
      .configureDatabaseEnv("mongodb")
      .configureDatabaseEnv("postgres");

    const env = readFileSync(path.join(appPath, ".env"), "utf8");

    expect((env.match(/DB_DRIVER=/g) ?? [])).toHaveLength(1);
    expect(env).toContain("DB_DRIVER=postgres");
    expect(env).toContain("DB_PORT=5432");
    expect(env).not.toContain("DB_PORT=27017");
  });

  it("keeps the ${APP_NAME} interpolation marker intact (case-sensitive substitution)", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock").updateDotEnv();

    const env = readFileSync(path.join(appPath, ".env"), "utf8");

    // updateDotEnv replaces lowercase `appName` only; the uppercase env-var
    // reference must be preserved for runtime interpolation.
    expect(env).toContain("MAIL_FROM_NAME=${APP_NAME}");
  });

  it("produces an internally consistent .env <-> database config pair", () => {
    const app = new App(makeApplication(appPath, { databaseDriver: "postgres" }));

    app.use("warlock").updateDotEnv().configureDatabaseEnv("postgres");

    const env = readFileSync(path.join(appPath, ".env"), "utf8");
    const dbConfig = readFileSync(
      path.join(appPath, "src/config/database.ts"),
      "utf8",
    );

    // Every env key the database config reads must exist in the generated .env.
    const referencedKeys = [...dbConfig.matchAll(/env\(\s*"([^"]+)"/g)].map(
      (match) => match[1],
    );

    // Guard against a vacuous pass if the config ever stops using env().
    expect(referencedKeys.length).toBeGreaterThan(3);

    for (const key of referencedKeys) {
      // DB_URL / DB_REPLICA_SET are optional and intentionally absent from .env.
      if (key === "DB_URL" || key === "DB_REPLICA_SET") continue;
      expect(env).toMatch(new RegExp(`^${key}=`, "m"));
    }

    expect(env).toContain("DB_DRIVER=postgres");
  });

  it("renders a .env with no leftover lowercase appName placeholder anywhere", () => {
    const app = new App(makeApplication(appPath));

    app.use("warlock").updateDotEnv();

    const env = readFileSync(path.join(appPath, ".env"), "utf8");

    expect(env).not.toMatch(/\bappName\b/);
  });
});
