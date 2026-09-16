import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Regression coverage for the 5.12.0 `npm run seed` defect on a fresh scaffold
 * (postgres + jwt): the template's `userSchema` declared `image` and
 * `lastLogin` as required, but the seed never supplies them — a seeded user
 * has never logged in and has no avatar yet.
 *
 * The template is an uncompiled scaffold tree, and create-warlock does not
 * depend on `@warlock.js/seal`, so this spec reads both template files as text
 * (the `template-integrity.spec.ts` convention) and checks the contract that
 * matters: every field the model requires unconditionally is written by the
 * seed. It must stay self-contained — CI checks out this repository alone, so
 * nothing may be imported from a sibling package's source tree.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const templateRoot = path.resolve(here, "..", "templates", "warlock");

function read(relativePath: string): string {
  return readFileSync(path.join(templateRoot, relativePath), "utf8");
}

/**
 * Field names in `userSchema = v.object({...})` whose rule chain can reject a
 * create without the field: not `.optional()`, and not conditional on `id`
 * (`requiredIfEmpty("id")` is satisfied on create only by supplying the field,
 * so it counts as required for a seed, which never passes an id).
 */
function requiredModelFields(modelSource: string): string[] {
  const schemaBody = modelSource.match(
    /userSchema\s*=\s*v\.object\(\{([\s\S]*?)\n\}\);/,
  );

  if (!schemaBody) {
    throw new Error(
      "Could not locate `userSchema = v.object({...})` in the template user model.",
    );
  }

  const fields: string[] = [];

  for (const line of schemaBody[1].split("\n")) {
    const field = line.match(/^\s*(\w+):\s*v\.(.+?),?\s*$/);

    if (!field) {
      continue;
    }

    if (!field[2].includes(".optional()")) {
      fields.push(field[1]);
    }
  }

  return fields;
}

/** Keys of the object literal passed to `User.create({...})` in the seed. */
function seededFields(seedSource: string): string[] {
  const createBody = seedSource.match(/User\.create\(\{([\s\S]*?)\}\)/);

  if (!createBody) {
    throw new Error(
      "Could not locate `User.create({...})` in the template users seed.",
    );
  }

  return [...createBody[1].matchAll(/^\s*(\w+):/gm)].map(match => match[1]);
}

describe("template users seed satisfies the template user model", () => {
  it("parses the model's fields, so an empty result can never pass vacuously", () => {
    const required = requiredModelFields(
      read("src/app/users/models/user/user.model.ts"),
    );

    expect(required).toEqual(
      expect.arrayContaining(["name", "email", "password"]),
    );
  });

  it("writes every field the model requires", () => {
    const required = requiredModelFields(
      read("src/app/users/models/user/user.model.ts"),
    );
    const seeded = seededFields(read("src/app/users/seeds/users.seed.ts"));

    const missing = required.filter(field => !seeded.includes(field));

    expect(
      missing,
      `users.seed.ts omits required model fields: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
