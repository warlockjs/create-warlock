import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { findResolverBoundaryViolations } from "../scripts/check-resolver-boundaries.mjs";

const fixtures: string[] = [];

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "resolver-boundaries-"));
  fixtures.push(root);
  writeFileSync(path.join(root, "package.json"), '{"name":"fixture"}');

  for (const [relativePath, contents] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents);
  }

  return root;
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("resolver publication boundaries", () => {
  it("allows tsconfig paths and Vite/Vitest aliases inside the package", () => {
    const root = fixture({
      "tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "app/*": ["src/*"] } } }),
      "vite.config.ts": 'export default { resolve: { alias: { app: "./src" } } };',
      "vitest.config.ts": 'export default { resolve: { alias: [{ find: "app", replacement: "./src" }] } };',
      "src/index.ts": "export {};",
    });

    expect(findResolverBoundaryViolations(root)).toEqual([]);
  });

  it("rejects a tsconfig path that escapes the independently published package", () => {
    const root = fixture({
      "tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "shared/*": ["../sibling/*"] } } }),
    });

    expect(findResolverBoundaryViolations(root)).toMatchObject([{ kind: "tsconfig paths" }]);
  });

  it("rejects Vite and Vitest aliases that escape the independently published package", () => {
    const root = fixture({
      "vite.config.ts": 'export default { resolve: { alias: { sibling: "../sibling" } } };',
      "vitest.config.ts": 'export default { resolve: { alias: [{ find: "sibling", replacement: "../sibling" }] } };',
    });

    const violations = findResolverBoundaryViolations(root);

    expect(violations).toHaveLength(2);
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ configFile: path.join(root, "vite.config.ts"), kind: "Vite/Vitest alias" }),
        expect.objectContaining({ configFile: path.join(root, "vitest.config.ts"), kind: "Vite/Vitest alias" }),
      ]),
    );
  });
});
