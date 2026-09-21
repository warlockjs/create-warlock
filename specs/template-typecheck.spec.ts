import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The real typecheck gate for `templates/warlock/`.
 *
 * `specs/template-integrity.spec.ts` reads template files as TEXT — it can
 * never catch a template importing something the framework no longer
 * exports, because it never asks a compiler. This spec runs `tsc --noEmit`
 * (via `scripts/typecheck-template.mjs`) against `tsconfig.template-check.json`,
 * which redirects every `@warlock.js/*` import the template makes to that
 * package's source in THIS checkout, so a local, uncommitted framework change
 * fails this spec immediately instead of surfacing only when someone
 * scaffolds a project against a published release.
 *
 * `tsc` over ~20 template files plus everything their imports transitively
 * reach (most of `@warlock.js/core`, `@warlock.js/web`, etc., from source)
 * took 152.48s alone; the 300s timeout leaves room for ordinary machine load
 * while still guarding against a genuine hang.
 */

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("templates/warlock/ typechecks against this checkout's framework source", () => {
  it("tsc --noEmit exits clean", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(packageRoot, "scripts", "typecheck-template.mjs")],
      { cwd: packageRoot, encoding: "utf8" },
    );

    if (result.status !== 0) {
      throw new Error(
        `templates/warlock/ failed to typecheck (exit ${result.status}):\n\n${result.stdout}\n${result.stderr}`,
      );
    }

    expect(result.status).toBe(0);
  }, 300_000);
});
