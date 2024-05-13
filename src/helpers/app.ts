import {
  copyDirectory,
  fileExists,
  getFile,
  getJsonFile,
  putFile,
  putJsonFile,
  renameFile,
} from "@mongez/fs";
import path from "path";
import { Application } from "src/commands/create-new-app/types";
import { executeCommand } from "src/helpers/exec";
import { Template, template } from "src/helpers/paths";
import {
  allDone,
  initializeGitRepository,
  installDependencies,
} from "src/helpers/project-builder-helpers";
import { getPackageManager } from "./package-manager";

export class App {
  /**
   * Resolved files
   */
  protected files: Record<string, FileManager> = {};

  public isInstalled = false;

  public constructor(protected app: Application) {}

  public use(templateName: Template) {
    copyDirectory(template(templateName), this.path);

    if (fileExists(this.path + "/.env.example")) {
      renameFile(this.path + "/.env.example", this.path + "/.env");
    }

    renameFile(this.path + "/_.gitignore", this.path + "/.gitignore");

    return this;
  }

  public init() {
    return this;
  }

  public terminate() {
    allDone(this.name);
  }

  public async install() {
    this.isInstalled = await installDependencies(this.path);

    return this;
  }

  public async exec(command: string) {
    const [commandName, ...optionsList] = command.split(" ");

    return await executeCommand(commandName, optionsList, this.path);
  }

  public async git() {
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
   * Get package json file
   */
  public get package() {
    return this.json("package.json");
  }

  public updateDotEnv() {
    this.file(".env").replace("appName", this.name).save();

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

  public json(relativePath: string) {
    const fullPath = path.resolve(this.path, relativePath);

    if (!this.files[fullPath]) {
      this.files[fullPath] = jsonFile(fullPath);
    }

    return this.files[fullPath];
  }
}

export function app(app: Application) {
  return new App(app);
}

export class FileManager {
  public content!: string;
  public constructor(protected filePath) {
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
