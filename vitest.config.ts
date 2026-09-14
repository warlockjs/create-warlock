import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["{specs,tests}/**/*.spec.ts"],
    // Many specs generate a real scaffold app and run tooling (eslint) over it —
    // inherently slow (~11s each) and slower still when the release gate builds
    // all 28 packages concurrently. 20s was too tight and flaked under gate load;
    // a higher cap only bites a genuine hang, never a passing test.
    testTimeout: 120_000,
  },
});
