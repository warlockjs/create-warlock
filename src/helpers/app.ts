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
import path from "path";
import { AppOptions, Application } from "../commands/create-new-app/types";
import { getDatabaseDriver } from "../features/database-drivers";
import { executeCommand, runCommand } from "./exec";
import { getPackageManager } from "./package-manager";
import { packageRoot, Template, template } from "./paths";

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
    return runCommand(getPackageManager(), ["install"], this.path);
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

  public updatePackageJson() {
    const pkg = this.package
      .replace("name", this.name.replaceAll("/", "-"))
      .replaceAll("yarn", getPackageManager());

    // Pin every @warlock.js/* dependency to THIS create-warlock release version
    // so a scaffolded project always matches the framework version it was created
    // with. create-warlock and the framework ship in lockstep, so the scaffolder's
    // own version is the single source of truth (the template's hardcoded versions
    // are irrelevant — they get overwritten here).
    const warlockVersion: string = getJsonFile(packageRoot("package.json")).version;
    const content: any = pkg.content;

    for (const field of ["dependencies", "devDependencies"] as const) {
      const deps = content[field] as Record<string, string> | undefined;
      if (!deps) continue;

      for (const dependency of Object.keys(deps)) {
        if (dependency.startsWith("@warlock.js/")) {
          deps[dependency] = warlockVersion;
        }
      }
    }

    pkg.save();

    return this;
  }

  /**
   * Wire DB_DRIVER and DB_PORT into .env.
   *
   * The driver's npm package is installed via `warlock add` (single source for
   * versions), so this only touches environment configuration — not deps.
   */
  public configureDatabaseEnv(driverValue: string) {
    const driver = getDatabaseDriver(driverValue);

    if (!driver) return this;

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
