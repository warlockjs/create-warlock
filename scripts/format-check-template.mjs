#!/usr/bin/env node
/**
 * The template formatter gate.
 *
 * Checks the TypeScript sources under `templates/warlock/src/` against the
 * template's OWN `.prettierrc.json` — the same file that is copied verbatim
 * into every scaffolded project — and fails if any of them is unformatted.
 * `checkedRoot` below says why the set is exactly that and not wider.
 *
 * ## Why this exists
 *
 * A fresh `npm create warlock@5.3.1` scaffold started and built, but the dev
 * server's health check reported `prettier/prettier` at
 * `src/app/auth/utils/types.ts:10`: 85 files checked, 84 healthy, 1 defective.
 * The defect had shipped in the published package because nothing checked the
 * template's formatting anywhere between authoring it and a user receiving it.
 *
 * The scaffolded project lints itself, but that is far too late: the first
 * person to see the error is the user, in their own new project, on their first
 * `warlock dev`.
 *
 * ## Why it checks the template and not a scaffold
 *
 * `scripts/typecheck-scaffold.mjs` deliberately scaffolds and installs, because
 * typechecking needs the framework's real types — point `tsc` at the bare
 * template and every `@warlock.js/*` import is unresolved.
 *
 * Formatting has no such dependency. Prettier needs no module resolution and no
 * `node_modules`, and the scaffold's `.prettierrc.json` IS the template's, byte
 * for byte. So a template-level check is not an approximation of the scaffold's
 * check — it is the same check, minutes earlier, at the place the defect can
 * actually be fixed.
 *
 * Usage:
 *   node scripts/format-check-template.mjs         # check, exit 1 on any defect
 *   node scripts/format-check-template.mjs --write # format in place
 */

import { readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const templateRoot = path.join(packageRoot, "templates", "warlock");

/**
 * The scaffolded project lints `./src`, and its `prettier/prettier` rule applies
 * to TypeScript files only — see the `files` entry in
 * `templates/warlock/eslint.config.js`. This gate checks EXACTLY that set, so a
 * pass here means a pass there.
 *
 * Widening it was tried and rejected: checking the whole template reports ten
 * further files under `docs/` and `skills/`, none of which the scaffold lints
 * and none of which a user ever sees. Reformatting them would also rewrite the
 * `SKILL.md` files, where Prettier has already once corrupted an emitted-HTML
 * sample badly enough to need a `prettier-ignore` guard.
 */
const checkedRoot = path.join(templateRoot, "src");
const shouldWrite = process.argv.includes("--write");

/** The only extensions the scaffold's `prettier/prettier` rule applies to. */
const CHECKED_EXTENSIONS = new Set([".ts", ".tsx"]);

/** Directories that never contain authored template source. */
const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist", ".git", ".turbo"]);

/**
 * Resolve Prettier from this package, never through a shell shim
 * (workspace rule: no `npx`, no `pnpm exec`). Prettier 3 ships CommonJS, so it
 * is required rather than imported — `await import()` of a CJS module hands
 * back a namespace whose functions hide behind `.default`.
 */
const prettier = createRequire(import.meta.url)("prettier");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      files.push(...(await collectFiles(absolute)));
      continue;
    }

    if (CHECKED_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files;
}

const files = (await collectFiles(checkedRoot)).sort();

if (files.length === 0) {
  console.error(`template formatter gate: no files found under ${checkedRoot}`);
  process.exit(1);
}

const defective = [];

for (const file of files) {
  // `resolveConfig` reads the TEMPLATE's own .prettierrc.json, including its
  // plugins — the same configuration the scaffolded project receives.
  const options = await prettier.resolveConfig(file, { editorconfig: false });
  const source = readFileSync(file, "utf8");
  const settings = { ...options, filepath: file };

  if (shouldWrite) {
    const formatted = await prettier.format(source, settings);

    if (formatted !== source) {
      writeFileSync(file, formatted);
      console.log(`formatted ${path.relative(templateRoot, file)}`);
    }

    continue;
  }

  if (!(await prettier.check(source, settings))) {
    defective.push(path.relative(templateRoot, file));
  }
}

if (shouldWrite) {
  console.log(
    `template formatter gate: ${files.length} file(s) formatted in place.`,
  );
  process.exit(0);
}

if (defective.length > 0) {
  console.error(
    `template formatter gate FAILED: ${files.length} file(s) checked, ` +
      `${files.length - defective.length} healthy, ${defective.length} defective.`,
  );

  for (const file of defective) {
    console.error(`  ${file}`);
  }

  console.error(
    "\nThese ship to every user who scaffolds a project, and their dev server " +
      "reports them as errors on first run.\nFix with: node scripts/format-check-template.mjs --write",
  );

  process.exit(1);
}

console.log(
  `template formatter gate: ${files.length} file(s) checked, all formatted.`,
);
