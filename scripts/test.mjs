// Runs the release test phases without a shell so callers can pass Vitest
// options through one portable package-script entry point.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phases = [
  {
    name: "source format check",
    args: [
      path.join(root, "node_modules", "prettier", "bin", "prettier.cjs"),
      "--check",
      "./src/**/*.{js,jsx,ts,tsx,css,md,json}",
      "--config",
      "./.prettierrc.json",
    ],
  },
  {
    name: "template format check",
    args: [path.join(root, "scripts", "format-check-template.mjs")],
  },
  {
    name: "Vitest",
    args: [
      path.join(root, "node_modules", "vitest", "vitest.mjs"),
      "run",
      ...process.argv.slice(2),
    ],
  },
];

for (const phase of phases) {
  const result = spawnSync(process.execPath, phase.args, {
    cwd: root,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`${phase.name} failed to start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.signal) {
    console.error(`${phase.name} ended from signal ${result.signal}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${phase.name} failed.`);
    process.exit(result.status ?? 1);
  }
}
