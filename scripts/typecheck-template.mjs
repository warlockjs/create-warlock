#!/usr/bin/env node
/**
 * Typechecks `templates/warlock/src/` against this checkout's OWN
 * `@warlock.js/*` sources (see tsconfig.template-check.json for how). Exits
 * non-zero, with tsc's own diagnostics on stdout, on any type error.
 *
 * Usage:
 *   node scripts/typecheck-template.mjs
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const tsc = spawnSync(
  process.execPath,
  [
    path.join(packageRoot, "node_modules", "typescript", "bin", "tsc"),
    "-p",
    path.join(packageRoot, "tsconfig.template-check.json"),
    "--noEmit",
  ],
  { cwd: packageRoot, stdio: "inherit" },
);

if (tsc.status !== 0) {
  console.error("\ntemplates/warlock/ does not typecheck against this checkout's framework source.\n");
}

process.exit(tsc.status ?? 1);
