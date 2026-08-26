import {
  copyDirectory,
  copyFile,
  fileExists,
  getFile,
  getJsonFile,
  putFile,
  putJsonFile,
  renameFile,
} from "@warlock.js/fs";
import { unlinkSync } from "node:fs";
import path from "path";
import { AppOptions, Application } from "../commands/create-new-app/types";
import { getDatabaseDriver } from "../features/database-drivers";
import { executeCommand, runCommand } from "./exec";
import { getPackageManager } from "./package-manager";
import { packageRoot, Template, template } from "./paths";
import { fallbackRange } from "./warlock-versions";

/**
 * Environment for every install the scaffolder spawns.
 *
 * A shell that exports `NODE_ENV=production` makes the package managers skip
 * every devDependency — and still exit 0. The scaffolded project needs its dev
 * toolchain (typescript, vitest, eslint) to be usable at all, so the install
 * child is pinned to `development` regardless of the ambient environment. A
 * silently incomplete install that reports success is the exact failure mode
 * this file exists to prevent.
 */
export function installEnvironment(): NodeJS.ProcessEnv {
  return { NODE_ENV: "development" };
}

export class App {
  /**
   * Resolved files
   */
  protected files: Record<string, FileManager> = {};

  /**
   * Resolved JSON files
   */
  protected jsonFiles: Record<string, JsonFileManager> = {};

  public isInstalled = false;

  public constructor(protected app: Application) {}

  public get options(): AppOptions {
    return this.app.options;
  }

  public use(templateName: Template) {
    copyDirectory(template(templateName), this.path);

    if (fileExists(this.path + "/.env.example")) {
      copyFile(this.path + "/.env.example", this.path + "/.env");
    }

    renameFile(this.path + "/_.gitignore", this.path + "/.gitignore");

    return this;
  }

  public init() {
    return this;
  }

  public terminate() {
    // No longer using outro, using showSuccessScreen instead
  }

  public install() {
    return runCommand(getPackageManager(), ["install"], this.path, {
      env: installEnvironment(),
    });
  }

  public async exec(command: string) {
    const [commandName, ...optionsList] = command.split(" ");
    return await executeCommand(commandName, optionsList, this.path);
  }

  public async git() {
    const { initializeGitRepository } = await import(
      "./project-builder-helpers"
    );
    return await initializeGitRepository(this.path);
  }

  /**
   * Write the project's `package.json`: the project name, the chosen package
   * manager, and the version of every `@warlock.js/*` dependency.
   *
   * `versions` comes from {@link resolveWarlockVersions} — versions the
   * registry has confirmed exist. It is optional because the fluent chain is
   * synchronous; without it every sibling gets the caret range floored to the
   * scaffolder's major, which is always satisfiable by a published release.
   *
   * What it must NEVER do again is stamp the scaffolder's own version blind:
   * the release tooling bumps that version on every build, published or not,
   * so an unverified pin resolves to nothing and the install dies with ETARGET.
   */
  public updatePackageJson(versions: Record<string, string> = {}) {
    const packageManager = getPackageManager();

    const pkg = this.package.replace("name", this.name.replaceAll("/", "-"));

    const content: any = pkg.content;

    // Substitute the chosen package manager ONLY into the fields the template
    // writes it into literally — the `serve` script and the huskier hooks — by
    // path, never with a blanket substring replace over the serialized JSON. A
    // raw `replaceAll("yarn", pm)` rewrites every occurrence of the substring
    // "yarn" anywhere in the document, so a project named `my-yarn-app`, or any
    // dependency/path containing "yarn", is silently corrupted (`--pm=npm`
    // turned `my-yarn-app` into `my-npm-app`). Field-scoped rewriting is also
    // order-independent: the name lives in `content.name` and these tokens live
    // in `scripts.serve` / `huskier.hooks`, disjoint fields that cannot collide
    // with the name substitution above regardless of which runs first.
    if (typeof content.scripts?.serve === "string") {
      content.scripts.serve = content.scripts.serve.replaceAll(
        "yarn",
        packageManager,
      );
    }

    const hooks = content.huskier?.hooks as
      | Record<string, unknown>
      | undefined;

    if (hooks) {
      for (const hook of Object.keys(hooks)) {
        const commands = hooks[hook];

        if (!Array.isArray(commands)) continue;

        hooks[hook] = commands.map(command =>
          typeof command === "string"
            ? command.replaceAll("yarn", packageManager)
            : command,
        );
      }
    }

    const warlockVersion: string = (
      getJsonFile(packageRoot("package.json")) as { version: string }
    ).version;
    const defaultRange = fallbackRange(warlockVersion);

    for (const field of ["dependencies", "devDependencies"] as const) {
      const deps = content[field] as Record<string, string> | undefined;
      if (!deps) continue;

      for (const dependency of Object.keys(deps)) {
        if (dependency.startsWith("@warlock.js/")) {
          deps[dependency] = versions[dependency] ?? defaultRange;
        }
      }
    }

    pkg.save();

    return this;
  }

  /**
   * Configure the chosen database driver: wire `DB_DRIVER` / `DB_PORT` into
   * `.env`, AND pin the driver's npm package (`mongodb` / `pg`) into the
   * project's `package.json` dependencies.
   *
   * The dependency is written HERE — before the base `yarn install` — so the
   * driver is pulled deterministically by the very first install. We do NOT
   * rely on the post-copy `warlock add <driver> --no-install` + separate
   * batched install, which can be skipped or fail and leave the driver
   * missing (the "mongodb package is not installed" runtime error).
   */
  public configureDatabaseEnv(driverValue: string) {
    const driver = getDatabaseDriver(driverValue);

    if (!driver) return this;

    // Pin the driver package into dependencies (idempotent — never downgrade).
    const packageJsonPath = path.resolve(this.path, "package.json");
    const packageJson = getJsonFile(packageJsonPath) as {
      dependencies?: Record<string, string>;
    };
    packageJson.dependencies = packageJson.dependencies ?? {};
    if (!packageJson.dependencies[driver.package]) {
      packageJson.dependencies[driver.package] = driver.packageVersion;
      putJsonFile(packageJsonPath, packageJson);
    }

    let envContent = getFile(this.path + "/.env") as string;

    envContent = envContent.replace(/DB_PORT=\d+/, `DB_PORT=${driver.defaultPort}`);

    if (envContent.includes("DB_DRIVER=")) {
      envContent = envContent.replace(/DB_DRIVER=\w*/, `DB_DRIVER=${driver.value}`);
    } else {
      envContent = envContent.replace(
        /DB_PORT=\d+/,
        `DB_PORT=${driver.defaultPort}\nDB_DRIVER=${driver.value}`,
      );
    }

    putFile(this.path + "/.env", envContent);

    return this;
  }

  /**
   * Remove the database layer for a "no database" scaffold.
   *
   * Deletes `src/config/database.ts` (and a `.tsx` variant if present) from the
   * freshly-copied template. The framework's database connector is config-gated
   * on that file — with it gone, `config.get("database")` is undefined and the
   * connector no-ops, so the app boots with no database wired and no driver
   * package pulled. The `DB_*` lines in `.env` are left in place (harmless: no
   * config reads them) as a ready template for adding a database back later.
   */
  public removeDatabaseConfig() {
    const configDir = path.resolve(this.path, "src/config");

    for (const fileName of ["database.ts", "database.tsx"]) {
      const filePath = path.resolve(configDir, fileName);

      if (fileExists(filePath)) {
        unlinkSync(filePath);
      }
    }

    return this;
  }

  /**
   * Pick the home page implementation based on whether React was selected.
   *
   * The template ships BOTH a plain JSON controller (`home-page.controller.ts`)
   * and a React-rendered page (`home-page.controller.tsx` + `HomePageComponent.tsx`).
   * Exactly one survives the scaffold: React projects keep the `.tsx` page (its
   * `react`/`react-dom` deps come from the `react` feature), every other project
   * keeps the dependency-free JSON controller — so a fresh project never imports
   * `react` unless it asked for it.
   */
  public configureHomePage(useReact: boolean) {
    const controllers = this.path + "/src/app/shared/controllers";
    const components = this.path + "/src/app/shared/components";

    const remove = (file: string) => {
      if (fileExists(file)) unlinkSync(file);
    };

    if (useReact) {
      remove(controllers + "/home-page.controller.ts");
    } else {
      remove(controllers + "/home-page.controller.tsx");
      remove(components + "/HomePageComponent.tsx");
    }

    return this;
  }

  /**
   * Install the selected optional features by delegating to the project's own
   * `warlock add`. `--no-install` records every dependency in package.json and
   * ejects configs / scripts / setup hooks WITHOUT installing — the caller runs
   * one batched install afterwards. Versions come from core's feature map, so
   * the scaffolder never duplicates them.
   *
   * `--no-install` is passed LAST on purpose: the CLI parser treats the
   * positional after a bare flag as that flag's value, so it must follow the
   * feature list, not precede it.
   */
  public async installFeatures(features: string[]) {
    if (features.length === 0) return true;

    return this.exec(`npx warlock add ${features.join(" ")} --no-install`);
  }

  /**
   * Force a single copy of `vite` when the project ends up with BOTH `vite`
   * (written by the `web` feature) and `vitest` (always in the template).
   *
   * `vitest` depends on vite through a wide range of its own
   * (`^6 || ^7 || ^8`), which resolves to a DIFFERENT major than the range the
   * feature map pins. Yarn 1 then has to nest the second copy under
   * `vitest/node_modules` and dies on its own linker invariant:
   *
   *     error Invariant Violation: could not find a copy of vite to link in
   *       <project>/node_modules/vitest/node_modules
   *
   * It aborts BEFORE `node_modules/.bin` is written, so `warlock` is never
   * linked and the very first `yarn dev` fails with "'warlock' is not
   * recognized". npm and pnpm nest happily and never hit this — for them the
   * `overrides` twin below is one copy instead of two, not a crash fix.
   *
   * The pin is READ BACK from whatever range the project's own package.json
   * declares, never re-stated as a literal here: the feature map in
   * `@warlock.js/core` owns the version, and a second copy of it would drift
   * the moment that one moves.
   *
   * Returns whether a pin was written, so the caller (and its spec) can assert
   * it instead of assuming it.
   */
  public pinViteResolution() {
    const packageJsonPath = path.resolve(this.path, "package.json");

    if (!fileExists(packageJsonPath)) return false;

    const packageJson = getJsonFile(packageJsonPath) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      resolutions?: Record<string, string>;
      overrides?: Record<string, string>;
    };

    const declaredRange = (name: string) =>
      packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];

    const viteRange = declaredRange("vite");

    // No vite, or no vitest to conflict with it — nothing to pin. Writing a
    // resolution for a package the project does not depend on would only
    // freeze a transitive tree nobody asked us to freeze.
    if (!viteRange || !declaredRange("vitest")) return false;

    // yarn 1 / yarn berry read `resolutions`; npm 8+ and pnpm read `overrides`.
    packageJson.resolutions = { ...packageJson.resolutions, vite: viteRange };
    packageJson.overrides = { ...packageJson.overrides, vite: viteRange };

    putJsonFile(packageJsonPath, packageJson);

    return true;
  }

  /**
   * Get package json file
   */
  public get package() {
    return this.json("package.json");
  }

  public updateDotEnv() {
    this.file(".env").replaceAll("appName", this.name).save();

    return this;
  }

  /**
   * Get env file to update
   */
  public get env() {
    return this.file(".env");
  }

  public get name() {
    return this.app.appName;
  }

  public get path() {
    return this.app.appPath;
  }

  public file(relativePath: string) {
    const fullPath = path.resolve(this.path, relativePath);

    if (!this.files[fullPath]) {
      this.files[fullPath] = file(fullPath);
    }

    return this.files[fullPath];
  }

  public json(relativePath: string): JsonFileManager {
    const fullPath = path.resolve(this.path, relativePath);

    if (!this.jsonFiles[fullPath]) {
      this.jsonFiles[fullPath] = jsonFile(fullPath);
    }

    return this.jsonFiles[fullPath];
  }
}

export function app(app: Application) {
  return new App(app);
}

export class FileManager {
  public content!: string;
  public constructor(protected filePath: string) {
    this.parseContent();
  }

  protected parseContent() {
    this.content = getFile(this.filePath) as string;
  }

  public replace(search: string, replace: string) {
    this.content = this.content.replace(search, replace);

    return this;
  }

  public replaceAll(search: string, replace: string) {
    this.content = this.content.replaceAll(search, replace);

    return this;
  }

  public save() {
    putFile(this.filePath, this.content);
  }
}

export class JsonFileManager extends FileManager {
  protected parseContent() {
    this.content = getJsonFile(this.filePath);
  }

  public save() {
    putJsonFile(this.filePath, this.content);
  }

  public has(key: string) {
    return this.content[key] !== undefined;
  }

  public replace(key: string, value: any) {
    this.content[key] = value;

    return this;
  }

  public replaceAll(key: string, value: any) {
    const contentAsString = JSON.stringify(this.content);

    this.content = JSON.parse(contentAsString.replaceAll(key, value));

    return this;
  }
}

export function file(path: string) {
  return new FileManager(path);
}

export function jsonFile(path: string) {
  return new JsonFileManager(path);
}
