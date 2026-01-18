import {
  copyDirectory,
  copyFile,
  fileExists,
  getFile,
  getJsonFile,
  putFile,
  putJsonFile,
  renameFile,
} from "@mongez/fs";
import path from "path";
import { AppOptions, Application } from "../commands/create-new-app/types";
import {
  getDatabaseDependency,
  getDatabaseDriver,
} from "../features/database-drivers";
import {
  getFeatureConfigStubs,
  getFeatureDependencies,
} from "../features/features-map";
import { executeCommand, runCommand } from "./exec";
import { getPackageManager } from "./package-manager";
import { Template, template } from "./paths";

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

  public constructor(protected app: Application) {
    //
  }

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
    this.package
      .replace("name", this.name.replaceAll("/", "-"))
      .replaceAll("yarn", getPackageManager())
      .save();

    return this;
  }

  /**
   * Add database driver dependency to package.json
   */
  public addDatabaseDriver(driverValue: string) {
    const dependency = getDatabaseDependency(driverValue);
    const driver = getDatabaseDriver(driverValue);

    // Add dependency
    const packageJson = this.package;
    for (const [pkg, version] of Object.entries(dependency)) {
      (packageJson.content as Record<string, any>).dependencies[pkg] = version;
    }
    packageJson.save();

    // Update .env with DB_DRIVER and DB_PORT
    if (driver) {
      let envContent = getFile(this.path + "/.env") as string;
      envContent = envContent.replace(
        /DB_PORT=\d+/,
        `DB_PORT=${driver.defaultPort}`,
      );

      // Add DB_DRIVER if not present, or update it
      if (envContent.includes("DB_DRIVER=")) {
        envContent = envContent.replace(
          /DB_DRIVER=\w*/,
          `DB_DRIVER=${driver.value}`,
        );
      } else {
        // Add after DB_PORT line
        envContent = envContent.replace(
          /DB_PORT=\d+/,
          `DB_PORT=${driver.defaultPort}\nDB_DRIVER=${driver.value}`,
        );
      }

      putFile(this.path + "/.env", envContent);
    }

    return this;
  }

  /**
   * Add selected features' dependencies to package.json
   */
  public addFeatures(features: string[]) {
    if (features.length === 0) return this;

    const { dependencies, devDependencies } = getFeatureDependencies(features);
    const packageJson = this.package;

    // Merge dependencies
    for (const [pkg, version] of Object.entries(dependencies)) {
      (packageJson.content as Record<string, any>).dependencies[pkg] = version;
    }

    // Merge devDependencies
    for (const [pkg, version] of Object.entries(devDependencies)) {
      (packageJson.content as Record<string, any>).devDependencies[pkg] =
        version;
    }

    packageJson.save();

    return this;
  }

  /**
   * Copy config stubs for features that require them
   */
  public copyConfigStubs() {
    const features = this.options.features || [];
    const stubs = getFeatureConfigStubs(features);

    for (const stub of stubs) {
      const configPath = path.join(
        this.path,
        "src",
        "config",
        `${stub.name}.ts`,
      );

      // Only create if doesn't exist
      if (!fileExists(configPath)) {
        putFile(configPath, stub.content);
      }
    }

    return this;
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
  public content!: string | Record<string, any>;
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
    putFile(this.filePath, this.content as string);
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
