#!/usr/bin/env node
/**
 * The scaffold typecheck gate.
 *
 * Scaffolds a REAL project with the real scaffolder, into a throwaway
 * directory, installs its dependencies, and runs that project's own
 * `tsc --noEmit`. Any type error fails the build.
 *
 * ## Why it cannot just typecheck `templates/warlock/`
 *
 * The template directory has no `node_modules`. Point `tsc` at it and every
 * `@warlock.js/*` import is an unresolved module, so you either get a wall of
 * TS2307s or — if you silence those — a check that verifies nothing, because
 * every framework type has degenerated to `any`. Either way the interesting
 * class of bug is invisible: the template drifting away from the framework's
 * ACTUAL current API surface.
 *
 * That is precisely the rot this gate was created after. The template kept
 * reading `request.client`, a property that only ever compiled because v4's
 * `Request` carried a `[key: string]: any` index signature. v5 removed the
 * index signature, the property became a type error, and nothing in CI noticed
 * — until a real user scaffolded a project and it would not build. Six errors
 * had accumulated the same way.
 *
 * So the gate installs the framework from the registry, exactly as a user's
 * `create-warlock my-app` does, and typechecks what that user would receive.
 * Framework releases move independently of this repo, which means this gate can
 * go red without anyone touching this repo. That is a feature: it is the alarm
 * for "the framework moved out from under the template".
 *
 * ## What it deliberately does NOT do
 *
 * It never starts the app, never binds a port, never touches a database. It
 * scaffolds, installs, and typechecks. Nothing here needs a running server.
 *
 * Usage:
 *   node scripts/typecheck-scaffold.mjs            # scaffold, check, clean up
 *   node scripts/typecheck-scaffold.mjs --keep     # leave the project in place
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keepArtifacts = process.argv.includes("--keep");

const APP_NAME = "scaffold-typecheck-app";

/** `.cmd` shims on Windows are not executable without a shell. */
const isWindows = process.platform === "win32";

/**
 * Run a command to completion, streaming its output, and resolve with the exit
 * code plus the captured combined output.
 */
function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: isWindows,
      // The scaffolder's own install pins NODE_ENV=development so package
      // managers do not skip devDependencies — typescript is one of them, and
      // without it there is nothing to typecheck WITH.
      env: { ...process.env, NODE_ENV: "development", CI: "1" },
    });

    let output = "";

    const capture = chunk => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    };

    child.stdout.on("data", capture);
    child.stderr.on("data", capture);

    child.on("error", reject);
    child.on("close", code => resolve({ code: code ?? 1, output }));
  });
}

function heading(text) {
  console.log(`\n=== ${text} ===\n`);
}

async function main() {
  const workspace = mkdtempSync(path.join(tmpdir(), "create-warlock-gate-"));
  const appPath = path.join(workspace, APP_NAME);

  let failure = null;

  try {
    // The scaffolder is run from SOURCE (`index.dev.ts` via tsx), not from a
    // published build, so the gate checks the working tree — the whole point of
    // running it in this repo's CI.
    heading(`Scaffolding ${APP_NAME} into ${workspace}`);

    const scaffold = await run(
      "npx",
      [
        "--yes",
        "tsx",
        path.join(packageRoot, "index.dev.ts"),
        APP_NAME,
        "--db=mongodb",
        "--pm=npm",
        "--yes",
        "--no-git",
      ],
      workspace,
    );

    if (scaffold.code !== 0) {
      failure = `scaffolder exited with code ${scaffold.code}`;
      return;
    }

    if (!existsSync(path.join(appPath, "node_modules", "typescript"))) {
      failure =
        "the scaffolded project has no typescript installed — the install did " +
        "not complete, so the typecheck below would be vacuous";
      return;
    }

    heading(`Typechecking (tsc --noEmit) in ${appPath}`);

    const tsc = await run(
      path.join(appPath, "node_modules", ".bin", "tsc"),
      ["--noEmit"],
      appPath,
    );

    if (tsc.code !== 0) {
      failure = `a freshly scaffolded project does not typecheck (tsc exited ${tsc.code})`;
      return;
    }

    heading("Scaffold typechecks clean");
  } catch (error) {
    failure = error?.message ?? String(error);
  } finally {
    if (keepArtifacts) {
      console.log(`\nLeaving scaffold in place: ${appPath}`);
    } else {
      rmSync(workspace, { recursive: true, force: true });
    }

    if (failure) {
      console.error(`\ncreate-warlock scaffold gate FAILED: ${failure}\n`);
      process.exit(1);
    }
  }
}

main();
