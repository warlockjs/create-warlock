import { afterEach, describe, expect, it, vi } from "vitest";

import { installFailureHints, showProblems } from "../src/ui/report";

describe("dependency-install failure reporting", () => {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

  afterEach(() => {
    logSpy.mockClear();
  });

  it("diagnoses the captured npm edgesOut failure and gives working alternatives", () => {
    const result = {
      ok: false,
      command: "npm install",
      cwd: "/tmp/scaffold-typecheck-app",
      code: 1,
      signal: null,
      stdout: "npm verbose cli npm@10.9.2\n",
      stderr: "npm error Cannot read properties of null (reading 'edgesOut')\n",
    };

    showProblems([
      {
        step: "Dependency install",
        detail: "The project's dependencies were not installed.",
        result,
        hints: installFailureHints(result),
      },
    ]);

    const rendered = logSpy.mock.calls.flat().join("\n");

    expect(rendered).toContain("Detected npm 10.9.x");
    expect(rendered).toContain("npm install -g npm@11");
    expect(rendered).toContain("pnpm install");
    expect(rendered).toContain("yarn install");
  });
});
