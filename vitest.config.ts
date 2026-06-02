import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@warlock.js/fs": resolve(__dirname, "../fs/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["{specs,tests}/**/*.spec.ts"],
    testTimeout: 20_000,
  },
});
