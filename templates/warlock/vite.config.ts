import mongezVite from "@mongez/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [mongezVite()],
  test: {
    globalSetup: "./src/test-global-setup.ts", // HTTP server - runs once
    setupFiles: ["./src/test-setup.ts"], // DB/cache - runs per worker
    environment: "node",
    globals: false,
    include: ["src/app/**/*.test.ts"],
  },
});
