import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Application } from "../src/commands/create-new-app/types";

/**
 * Unit coverage for the `App` helper's command-driving + file-managing surface
 * that the template-emission tests in scaffolder.spec.ts don't reach: `install`,
 * `exec`, `git`, `installFeatures`, the file/json manager cache, and the small
 * factory functions. The process-spawning collaborators (`./exec`) and the git
 * bootstrap (`./project-builder-helpers`) are mocked so no real process runs.
 */

const runCommand = vi.fn(() => ({
  abort: vi.fn(),
  install: Promise.resolve(true),
}));
const executeCommand = vi.fn(async () => true);

vi.mock("../src/helpers/exec", () => ({
  runCommand: (...args: unknown[]) => runCommand(...args),
  executeCommand: (...args: unknown[]) => executeCommand(...args),
}));

const getPackageManager = vi.fn(() => "yarn");

vi.mock("../src/helpers/package-manager", () => ({
  getPackageManager: (...args: unknown[]) => getPackageManager(...args),
}));

const initializeGitRepository = vi.fn(async () => true);

vi.mock("../src/helpers/project-builder-helpers", () => ({
  initializeGitRepository: (...args: unknown[]) =>
    initializeGitRepository(...args),
}));

import {
  App,
  app,
  file,
  FileManager,
  jsonFile,
  JsonFileManager,
} from "../src/helpers/app";

let workdir: string;

function makeApp(appPath: string): App {
  const descriptor: Application = {
    appName: "my-warlock-app",
    appType: "warlock",
    appPath,
    pkgManager: "yarn",
    options: {
      databaseDriver: "mongodb",
      databasePort: 27017,
      features: [],
      aiProviders: [],
      useGit: false,
      useJWT: false,
    },
  };

  return new App(descriptor);
}

beforeEach(() => {
  vi.clearAllMocks();
  getPackageManager.mockReturnValue("yarn");
  runCommand.mockReturnValue({
    abort: vi.fn(),
    install: Promise.resolve(true),
  });
  executeCommand.mockResolvedValue(true);
  initializeGitRepository.mockResolvedValue(true);
  workdir = mkdtempSync(path.join(tmpdir(), "create-warlock-app-"));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe("App.install", () => {
  it("delegates to runCommand with `<pm> install` in the app directory", () => {
    const instance = makeApp(workdir);

    instance.install();

    expect(runCommand).toHaveBeenCalledWith("yarn", ["install"], workdir);
  });

  it("follows the active package manager", () => {
    getPackageManager.mockReturnValue("pnpm");
    const instance = makeApp(workdir);

    instance.install();

    expect(runCommand).toHaveBeenCalledWith("pnpm", ["install"], workdir);
  });
});

describe("App.exec", () => {
  it("splits the command string and runs it via executeCommand in the app dir", async () => {
    const instance = makeApp(workdir);

    await instance.exec("npx warlock --warm-cache");

    expect(executeCommand).toHaveBeenCalledWith(
      "npx",
      ["warlock", "--warm-cache"],
      workdir,
    );
  });

  it("passes a single-token command with an empty args array", async () => {
    const instance = makeApp(workdir);

    await instance.exec("clear");

    expect(executeCommand).toHaveBeenCalledWith("clear", [], workdir);
  });
});

describe("App.git", () => {
  it("bootstraps the repository through initializeGitRepository", async () => {
    const instance = makeApp(workdir);

    const result = await instance.git();

    expect(initializeGitRepository).toHaveBeenCalledWith(workdir);
    expect(result).toBe(true);
  });
});

describe("App.installFeatures", () => {
  it("returns true without spawning when the feature list is empty", async () => {
    const instance = makeApp(workdir);

    const result = await instance.installFeatures([]);

    expect(result).toBe(true);
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it("runs `npx warlock add <features> --no-install` with --no-install last", async () => {
    const instance = makeApp(workdir);

    await instance.installFeatures(["postgres", "test", "openai"]);

    expect(executeCommand).toHaveBeenCalledTimes(1);
    const [bin, args] = executeCommand.mock.calls[0];
    expect(bin).toBe("npx");
    expect(args).toEqual([
      "warlock",
      "add",
      "postgres",
      "test",
      "openai",
      "--no-install",
    ]);
    // --no-install MUST be the final token (the CLI parser would otherwise
    // swallow the first feature as the flag's value).
    expect(args[args.length - 1]).toBe("--no-install");
  });
});

describe("App.options getter", () => {
  it("exposes the underlying application options", () => {
    const instance = makeApp(workdir);

    expect(instance.options.databaseDriver).toBe("mongodb");
    expect(instance.options.databasePort).toBe(27017);
  });
});

describe("App file / json managers", () => {
  it("caches a FileManager per resolved path (same instance on re-access)", () => {
    writeFileSync(path.join(workdir, "notes.txt"), "hello");
    const instance = makeApp(workdir);

    const first = instance.file("notes.txt");
    const second = instance.file("notes.txt");

    expect(first).toBe(second);
  });

  it("caches a JsonFileManager per resolved path", () => {
    writeFileSync(
      path.join(workdir, "data.json"),
      JSON.stringify({ name: "x" }),
    );
    const instance = makeApp(workdir);

    const first = instance.json("data.json");
    const second = instance.json("data.json");

    expect(first).toBe(second);
  });

  it("reads package.json through the convenience getter", () => {
    writeFileSync(
      path.join(workdir, "package.json"),
      JSON.stringify({ name: "pkg", private: true }),
    );
    const instance = makeApp(workdir);

    expect(instance.package.has("name")).toBe(true);
    expect(instance.package.has("missing")).toBe(false);
  });
});

describe("FileManager", () => {
  it("replace swaps the first occurrence and save persists it", () => {
    const target = path.join(workdir, "f.txt");
    writeFileSync(target, "alpha alpha");

    const manager = file(target);
    manager.replace("alpha", "beta").save();

    const reread = file(target);
    expect(reread.content).toBe("beta alpha");
  });

  it("replaceAll swaps every occurrence", () => {
    const target = path.join(workdir, "g.txt");
    writeFileSync(target, "x x x");

    const manager = file(target);
    manager.replaceAll("x", "y").save();

    expect(file(target).content).toBe("y y y");
  });
});

describe("JsonFileManager", () => {
  it("has() reports presence of top-level keys", () => {
    const target = path.join(workdir, "p.json");
    writeFileSync(target, JSON.stringify({ a: 1 }));

    const manager = jsonFile(target);

    expect(manager.has("a")).toBe(true);
    expect(manager.has("b")).toBe(false);
  });

  it("replace sets a key and save writes valid JSON back", () => {
    const target = path.join(workdir, "q.json");
    writeFileSync(target, JSON.stringify({ name: "old" }));

    const manager = jsonFile(target);
    manager.replace("name", "new").save();

    const reread = jsonFile(target);
    expect(reread.has("name")).toBe(true);
    expect((reread.content as { name: string }).name).toBe("new");
  });

  it("replaceAll rewrites every textual occurrence of a token across the JSON", () => {
    const target = path.join(workdir, "r.json");
    writeFileSync(target, JSON.stringify({ a: "yarn build", b: "yarn dev" }));

    const manager = jsonFile(target);
    manager.replaceAll("yarn", "pnpm").save();

    const reread = jsonFile(target).content as { a: string; b: string };
    expect(reread.a).toBe("pnpm build");
    expect(reread.b).toBe("pnpm dev");
  });
});

describe("factory functions", () => {
  it("app() wraps an Application descriptor in an App instance", () => {
    const instance = app({
      appName: "factory-app",
      appType: "warlock",
      appPath: workdir,
      pkgManager: "yarn",
      options: {
        databaseDriver: "mongodb",
        databasePort: 27017,
        features: [],
        aiProviders: [],
        useGit: false,
        useJWT: false,
      },
    });

    expect(instance).toBeInstanceOf(App);
    expect(instance.name).toBe("factory-app");
    expect(instance.path).toBe(workdir);
  });

  it("file() and jsonFile() return the matching manager types", () => {
    const txt = path.join(workdir, "a.txt");
    const json = path.join(workdir, "a.json");
    writeFileSync(txt, "t");
    writeFileSync(json, "{}");

    expect(file(txt)).toBeInstanceOf(FileManager);
    expect(jsonFile(json)).toBeInstanceOf(JsonFileManager);
  });
});
