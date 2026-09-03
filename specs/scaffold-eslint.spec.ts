import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { Application } from "../src/commands/create-new-app/types";
import { App } from "../src/helpers/app";
import { setPackageManager } from "../src/helpers/package-manager";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const eslintEntry = path.join(
  packageRoot,
  "node_modules",
  "eslint",
  "bin",
  "eslint.js",
);
const generatedRoots: string[] = [];

function generateApp(): string {
  setPackageManager("yarn");

  // Keep the copied project under this package so imports in its flat config
  // resolve against create-warlock's installed test toolchain.
  const root = mkdtempSync(path.join(packageRoot, ".eslint-scaffold-"));
  const appPath = path.join(root, "generated-app");
  const application: Application = {
    appName: "eslint-proof",
    appType: "warlock",
    appPath,
    pkgManager: "yarn",
    options: {
      databaseDriver: "none",
      databasePort: 27017,
      features: [],
      aiProviders: [],
      useGit: false,
      useJWT: false,
    },
  };

  new App(application).use("warlock").configureWebStarter(false);
  generatedRoots.push(root);

  return appPath;
}

function lint(appPath: string) {
  return spawnSync(
    process.execPath,
    [eslintEntry, "--fix", "./src", "--max-warnings=0"],
    { cwd: appPath, encoding: "utf8" },
  );
}

afterEach(() => {
  for (const root of generatedRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("the ESLint config emitted by a real no-web scaffold", () => {
  it("keeps the innocent no-CSS scaffold linting exactly as before", () => {
    const appPath = generateApp();
    const sourceFiles = readdirSync(path.join(appPath, "src"), {
      recursive: true,
      withFileTypes: true,
    });

    expect(
      sourceFiles.some(entry => entry.isFile() && entry.name.endsWith(".css")),
    ).toBe(false);

    const result = lint(appPath);

    expect({ status: result.status, stderr: result.stderr }).toEqual({
      status: 0,
      stderr: "",
    });
  });

  it("leaves CSS unclaimed, while restoring the bad glob reproduces its exact parse failure", () => {
    const appPath = generateApp();
    const stylesheet = path.join(appPath, "src", "first-page.css");
    const configPath = path.join(appPath, "eslint.config.js");

    writeFileSync(stylesheet, ".page { color: rebeccapurple; }\n");

    const fixed = lint(appPath);
    expect({ status: fixed.status, stderr: fixed.stderr }).toEqual({
      status: 0,
      stderr: "",
    });

    const config = readFileSync(configPath, "utf8");
    const badConfig = config.replace(
      'files: ["**/*.ts", "**/*.tsx"],',
      'files: ["**/*.ts", "**/*.tsx", "**/*.css"],',
    );
    expect(badConfig).not.toBe(config);
    writeFileSync(configPath, badConfig);

    const broken = lint(appPath);
    const output = `${broken.stdout}\n${broken.stderr}`;

    expect(broken.status).not.toBe(0);
    expect(output).toContain(
      "Parsing error: Declaration or statement expected",
    );
  }, 60_000);

  it("assigns only TS forms to the TypeScript parser and states every other scaffold form", () => {
    const config = readFileSync(
      path.join(packageRoot, "templates", "warlock", "eslint.config.js"),
      "utf8",
    );

    const formOwners = {
      ".ts": "TypeScript parser block",
      ".tsx": "TypeScript parser block",
      ".mjs": "global block with ESLint's default parser",
      ".css": "deliberately unclaimed",
      ".json": "deliberately unclaimed",
      ".md": "deliberately unclaimed",
      images: "deliberately unclaimed",
    };

    expect(config).toContain('files: ["**/*.ts", "**/*.tsx"]');
    expect(config).not.toMatch(/files:\s*\[[^\]]*\.css/);
    expect(formOwners).toEqual({
      ".ts": "TypeScript parser block",
      ".tsx": "TypeScript parser block",
      ".mjs": "global block with ESLint's default parser",
      ".css": "deliberately unclaimed",
      ".json": "deliberately unclaimed",
      ".md": "deliberately unclaimed",
      images: "deliberately unclaimed",
    });
  });
});
