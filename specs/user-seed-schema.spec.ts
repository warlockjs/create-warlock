import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// create-warlock does not depend on @warlock.js/seal (it scaffolds it into
// generated apps, it doesn't consume it), so there is no linked copy in this
// package's own node_modules to resolve a bare specifier against. This is a
// monorepo sibling package whose `main`/`module` point straight at its own
// TypeScript source (no build step), so it's imported by relative path —
// the same real `v`/`validate` the template's generated app runs.
import { v, validate } from "../../seal/src/index.ts";

/**
 * Regression coverage for the 5.12.0 `npm run seed` defect on a fresh scaffold
 * (postgres + jwt): the template's `userSchema` declared `image` and
 * `lastLogin` as REQUIRED, but neither the seed data nor the password-login
 * flow ever supplies them — a user who never logged in has no `lastLogin`,
 * and a freshly-registered user may have no `image` yet (it is enforced at
 * the CONTROLLER's `create-user.schema.ts` layer, not the model layer).
 *
 * This spec proves the template's seed record validates against the
 * template's own model schema. It mirrors `userSchema` from
 * `templates/warlock/src/app/users/models/user/user.model.ts` field-for-field
 * (importing the template file directly isn't workable here: the template is
 * an uncompiled scaffold tree, not a module this spec's own dependency graph
 * can resolve — `app/users/resources/user.resource.ts` et al. — so, per the
 * existing `template-integrity.spec.ts` convention, the template source is
 * read as text and cross-checked against this mirrored schema instead of
 * imported). It validates with the REAL `@warlock.js/seal` `v` used by the
 * template (create-warlock's own workspace copy), so this is a genuine
 * validation run, not a text match.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const templateRoot = path.resolve(here, "..", "templates", "warlock");

function read(relativePath: string): string {
  return readFileSync(path.join(templateRoot, relativePath), "utf8");
}

// Mirrors templates/warlock/src/app/users/models/user/user.model.ts#userSchema
const userSchema = v.object({
  name: v.string().required(),
  email: v.email().requiredIfEmpty("id"),
  image: v.string().optional(),
  password: v.string().min(6).requiredIfEmpty("id"),
  lastLogin: v.date().optional(),
});

describe("template user seed data validates against the template user model schema", () => {
  it("keeps the mirrored schema in sync with the template's optional/required markers", () => {
    // Guards the mirror itself against silent drift: if the template adds
    // `.optional()` to a field (the fix) or changes required-ness some other
    // way, this test forces the mirror above to be updated to match, so the
    // validation below stays honest about what the template actually declares.
    const modelSource = read("src/app/users/models/user/user.model.ts");

    expect(modelSource).toMatch(/name:\s*v\.string\(\)\.required\(\)/);
    expect(modelSource).toMatch(/email:\s*v\.email\(\)\.requiredIfEmpty\("id"\)/);
    // Regression guard: image and lastLogin must stay optional at the model
    // layer — a fresh registration and a never-logged-in seed both write a
    // record without them (see the fix rationale above the schema mirror).
    expect(modelSource).toMatch(/image:\s*v\.string\(\)\.optional\(\),/);
    expect(modelSource).toMatch(
      /password:\s*v\.string\(\)\.min\(6\)\.requiredIfEmpty\("id"\)/,
    );
    expect(modelSource).toMatch(/lastLogin:\s*v\.date\(\)\.optional\(\),/);
  });

  it("validates the exact record templates/warlock/src/app/users/seeds/users.seed.ts creates", async () => {
    // Mirrors the User.create({...}) call in users.seed.ts: no image, no
    // lastLogin — a brand-new seeded user has never logged in and was never
    // assigned an avatar.
    const seedSource = read("src/app/users/seeds/users.seed.ts");

    expect(seedSource).not.toMatch(/image:/);
    expect(seedSource).not.toMatch(/lastLogin:/);

    const seedRecord = {
      name: "User 1",
      email: "user1@gmail.com",
      password: "password-1",
    };

    const result = await validate(userSchema, seedRecord);

    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
    expect(result.isValid).toBe(true);
  });
});
