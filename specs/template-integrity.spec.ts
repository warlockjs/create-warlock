import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Static integrity checks for the scaffolded `templates/warlock` tree.
 *
 * These tests read template files as TEXT and assert they line up with the
 * CURRENT framework surface. They never execute a template, so they stay inside
 * the create-warlock isolation boundary while still catching the kind of drift
 * that has shipped broken scaffolds before (e.g. the `text(N)` -> `string(N)`
 * migration-column regression).
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const templateRoot = path.resolve(here, "..", "templates", "warlock");

function read(relativePath: string): string {
  return readFileSync(path.join(templateRoot, relativePath), "utf8");
}

/**
 * Strip `//` and block comments from a source string.
 *
 * The checks below hunt for banned CODE. The template documents each ban in a
 * comment right where it used to live ("this used to read `request.client`…"),
 * and matching the prose would fail on the very explanation of the fix — so the
 * commentary is removed before the source is searched.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/**
 * Every `.ts`/`.tsx` file under the template's `src`, as paths relative to the
 * template root (so they can be handed straight to {@link read}).
 */
function templateSourceFiles(): string[] {
  const files: string[] = [];

  const walk = (relativeDir: string) => {
    for (const entry of readdirSync(path.join(templateRoot, relativeDir), {
      withFileTypes: true,
    })) {
      const relativePath = path.posix.join(relativeDir, entry.name);

      if (entry.isDirectory()) {
        walk(relativePath);
      } else if (/\.tsx?$/.test(entry.name)) {
        files.push(relativePath);
      }
    }
  };

  walk("src");

  return files;
}

const migrationTemplates = [
  "src/app/users/models/user/migrations/11-12-2025_23-58-03-user.migration.ts",
  "src/app/posts/models/post/migrations/09-01-2026_02-07-51-post.migration.ts",
  "src/app/auth/models/otp/migrations/22-12-2025_10-30-20.otp-migration.ts",
];

/**
 * The complete set of standalone column helpers exported by
 * `@warlock.js/cascade` (see `cascade/src/migration/column-helpers.ts`, which is
 * re-exported through `cascade/src/migration/index.ts` -> `cascade/src/index.ts`).
 * `Migration` itself is the factory class living in the same package.
 *
 * Kept in sync with source by hand on purpose: this list is the oracle the
 * drift guard compares the templates against, so it must be grounded in the
 * real exports, not assumed.
 */
const cascadeColumnExports = new Set<string>([
  "Migration",
  // string family
  "string",
  "char",
  "text",
  "mediumText",
  "longText",
  // numeric family
  "integer",
  "int",
  "smallInteger",
  "smallInt",
  "tinyInteger",
  "tinyInt",
  "bigInteger",
  "bigInt",
  "float",
  "double",
  "decimal",
  // boolean
  "boolCol",
  "bool",
  // date / time
  "date",
  "dateTime",
  "timestamp",
  "time",
  "year",
  // json / binary
  "json",
  "objectCol",
  "binary",
  "blobCol",
  // identifiers
  "uuid",
  "ulid",
  // network
  "ipAddress",
  "macAddress",
  // spatial
  "point",
  "polygon",
  "lineString",
  "geometry",
  // ai / ml
  "vector",
  // enum / set
  "enumCol",
  "setCol",
  // postgres arrays
  "arrayInt",
  "arrayBigInt",
  "arrayFloat",
  "arrayDecimal",
  "arrayBoolean",
  "arrayText",
  "arrayDate",
  "arrayTimestamp",
  "arrayUuid",
  "arrayJson",
]);

/**
 * Pull the named imports out of the FIRST `import { ... } from "<module>"` that
 * targets the given module in a source string. Returns the bare identifiers.
 */
function namedImportsFrom(source: string, moduleName: string): string[] {
  const pattern = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*["']${moduleName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )}["']`,
    "m",
  );
  const match = source.match(pattern);

  if (!match) return [];

  return match[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim());
}

describe("migration templates use only current cascade column helpers", () => {
  it.each(migrationTemplates)(
    "imports nothing from cascade that the framework does not export: %s",
    (templatePath) => {
      const source = read(templatePath);
      const imported = namedImportsFrom(source, "@warlock.js/cascade");

      expect(imported.length).toBeGreaterThan(0);

      const unknown = imported.filter((name) => !cascadeColumnExports.has(name));

      expect(unknown).toEqual([]);
    },
  );

  it.each(migrationTemplates)(
    "never calls text() with a length argument — text() is unlimited, fixed-length must use string(N): %s",
    (templatePath) => {
      const source = read(templatePath);

      // The exact drift a prior session fixed: text(255) is invalid because the
      // cascade helper `text()` takes no arguments. Guard against it returning.
      expect(source).not.toMatch(/\btext\s*\(\s*\d/);
    },
  );

  it.each(migrationTemplates)(
    "passes a length only to helpers that accept one (string/char/decimal/vector/enum/set): %s",
    (templatePath) => {
      const source = read(templatePath);

      // Collect every `helper(<args>)` call whose first arg is numeric, then make
      // sure the helper is one that legitimately takes a numeric/sized argument.
      const sizedCalls = [...source.matchAll(/\b([a-zA-Z]+)\s*\(\s*\d/g)].map(
        (match) => match[1],
      );

      const helpersThatTakeArgs = new Set([
        "string",
        "char",
        "decimal",
        "vector",
        "smallInteger",
      ]);

      const offenders = sizedCalls.filter(
        (helper) =>
          cascadeColumnExports.has(helper) && !helpersThatTakeArgs.has(helper),
      );

      expect(offenders).toEqual([]);
    },
  );

  it("user migration declares the columns the user schema relies on", () => {
    const source = read(migrationTemplates[0]);

    // Spot-check the regression-prone columns are present and sized via string().
    expect(source).toMatch(/name:\s*string\(\d+\)/);
    expect(source).toMatch(/email:\s*string\(\d+\)\.unique\(\)/);
    expect(source).toMatch(/password:\s*string\(\d+\)/);
  });

  it("post migration keeps description as unbounded text() with no length", () => {
    const source = read(migrationTemplates[1]);

    expect(source).toMatch(/description:\s*text\(\)/);
    expect(source).not.toMatch(/description:\s*text\(\d/);
  });
});

/**
 * Fast tripwires for the specific drift that shipped a template a fresh project
 * could not typecheck.
 *
 * These are NOT the real gate — the real gate is `npm run typecheck:scaffold`
 * (`scripts/typecheck-scaffold.mjs`), which scaffolds and installs a project and
 * runs its own `tsc --noEmit`. That takes minutes and needs the network. These
 * assertions cost milliseconds and catch each known regression by name, so the
 * common case is caught on `npm test` instead of at the end of a CI install.
 */
describe("template typecheck prerequisites", () => {
  const tsconfig = read("tsconfig.json");

  it("does not point typeRoots at a file — it takes directories of @types packages", () => {
    // The original bug: `"typeRoots": ["./src/typings.d.ts"]`. Wrong twice —
    // typeRoots wants directories, and that path did not exist at all.
    expect(tsconfig).not.toMatch(/"typeRoots"\s*:\s*\[[^\]]*\.d\.ts/);
  });

  it("ships src/typings.d.ts and lists it on include", () => {
    expect(() => read("src/typings.d.ts")).not.toThrow();
    expect(tsconfig).toMatch(/"include"\s*:\s*\[[^\]]*src\/typings\.d\.ts/);
  });

  it("resolves modules the way the framework's exports maps require", () => {
    // Every @warlock.js package ships an `exports` map. Classic "node"
    // resolution ignores it, so subpaths like `@warlock.js/core/tests` fail to
    // typecheck even though they run.
    expect(tsconfig).toMatch(/"moduleResolution"\s*:\s*"bundler"/i);
    expect(tsconfig).not.toMatch(/"moduleResolution"\s*:\s*"node"/i);
  });

  it("declares request augmentations as interface, never type — merging is interface-only", () => {
    const typings = stripComments(read("src/typings.d.ts"));

    expect(typings).toMatch(/declare module ["']@warlock\.js\/core["']/);
    expect(typings).toMatch(/interface RequestLocals\b/);
    expect(typings).toMatch(/interface RequestUser\b/);

    // A `type X = {...}` inside the augmentation block does not merge — it is a
    // duplicate-identifier error against the framework's own declaration.
    expect(typings).not.toMatch(/type\s+RequestLocals\s*=/);
    expect(typings).not.toMatch(/type\s+RequestUser\s*=/);
  });

  it("keeps src/typings.d.ts a module, so `declare module` augments instead of replacing", () => {
    const typings = read("src/typings.d.ts");

    // Without a top-level import/export this file is a SCRIPT, and
    // `declare module "@warlock.js/core"` then declares an AMBIENT module that
    // wipes out every real export of the package.
    expect(typings).toMatch(/^export\s*\{\s*\}\s*;?\s*$/m);
  });

  it("never reads request.client — v5 removed the index signature that allowed it", () => {
    const offenders = templateSourceFiles().filter(file =>
      /\brequest\.client\b/.test(stripComments(read(file))),
    );

    expect(offenders).toEqual([]);
  });

  it("starts the scheduler it registers jobs on", () => {
    // Registering jobs does not schedule them. Without start(), a fresh
    // project's first `warlock dev` warns and neither cleanup job ever runs.
    const authMain = read("src/app/auth/main.ts");

    expect(authMain).toMatch(/scheduler\.newJob\(/);
    expect(authMain).toMatch(/scheduler\.start\(\)/);
  });
});
