import { describe, expect, it } from "vitest";
import { insertImportInSortedPosition } from "../src/helpers/insert-import";

/**
 * The scaffolded app formats with `prettier-plugin-organize-imports`, which
 * orders imports alphabetically by module specifier. Injecting a feature's
 * import at the TOP of a config that already imports `@warlock.js/auth` and
 * `@warlock.js/core` therefore produced a `prettier/prettier` error on the
 * developer's first `warlock dev` — in a file they did not write, about code
 * they did not add.
 *
 * These assert the ordering itself rather than one observed output, because the
 * defect was never about the `web` feature in particular: any future injected
 * import lands in the same trap.
 */
describe("insertImportInSortedPosition", () => {
  const AUTH = `import {\n  authMigrations,\n} from "@warlock.js/auth";`;
  const CORE = `import { defineConfig } from "@warlock.js/core";`;
  const WEB = `import { webConnector } from "@warlock.js/web/connector";`;

  function importSpecifiersOf(source: string): string[] {
    return [...source.matchAll(/from\s+"([^"]+)";/g)].map(match => match[1] as string);
  }

  it("places the import AFTER earlier-sorting ones — the case the scaffolder actually hits", () => {
    const source = `${AUTH}\n${CORE}\n\nexport default defineConfig({});\n`;

    const result = insertImportInSortedPosition(source, WEB, "@warlock.js/web/connector");

    expect(importSpecifiersOf(result)).toEqual([
      "@warlock.js/auth",
      "@warlock.js/core",
      "@warlock.js/web/connector",
    ]);
  });

  it("places it BEFORE a later-sorting import rather than always appending", () => {
    const source = `${CORE}\n${WEB}\n\nexport default defineConfig({});\n`;

    const result = insertImportInSortedPosition(
      source,
      'import { auth } from "@warlock.js/auth";',
      "@warlock.js/auth",
    );

    expect(importSpecifiersOf(result)).toEqual([
      "@warlock.js/auth",
      "@warlock.js/core",
      "@warlock.js/web/connector",
    ]);
  });

  it("survives a multi-line braced import, which is the shape the real template uses", () => {
    const source = `${AUTH}\n\nexport default defineConfig({});\n`;

    const result = insertImportInSortedPosition(source, WEB, "@warlock.js/web/connector");

    expect(importSpecifiersOf(result)).toEqual(["@warlock.js/auth", "@warlock.js/web/connector"]);
    expect(result).toContain("authMigrations");
  });

  it("puts it at the top when there is nothing to sort against", () => {
    const result = insertImportInSortedPosition(
      "export default defineConfig({});\n",
      WEB,
      "@warlock.js/web/connector",
    );

    expect(result.startsWith(WEB)).toBe(true);
  });

  it("leaves the rest of the file untouched", () => {
    const body = `\nexport default defineConfig({\n  cli: { commands: [] },\n});\n`;
    const source = `${AUTH}\n${CORE}\n${body}`;

    const result = insertImportInSortedPosition(source, WEB, "@warlock.js/web/connector");

    expect(result).toContain(body);
  });
});
