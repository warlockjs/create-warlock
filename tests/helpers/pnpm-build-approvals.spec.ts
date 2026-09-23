import { describe, expect, it } from "vitest";
import {
  mergePnpmBuildApprovals,
  requiredPnpmBuildApprovals,
} from "../../src/helpers/pnpm-build-approvals";

describe("pnpm feature build approvals", () => {
  it("approves sharp for a fresh selected image feature alongside the template's esbuild policy", () => {
    expect(requiredPnpmBuildApprovals(["image"])).toEqual(["sharp"]);
    expect(
      mergePnpmBuildApprovals("allowBuilds:\n  esbuild: true\n", ["sharp"]),
    ).toBe("allowBuilds:\n  sharp: true\n  esbuild: true\n");
  });

  it("preserves an explicit sharp denial and unrelated workspace YAML", () => {
    const yaml =
      "packages:\n  - apps/*\nallowBuilds:\n  'sharp': false # user declined native builds\n  esbuild: true\nminimumReleaseAge: 60\n";
    expect(mergePnpmBuildApprovals(yaml, ["sharp"])).toBe(yaml);
  });

  it("replaces pnpm's undecided sharp placeholder in place and stays idempotent", () => {
    const yaml =
      "allowBuilds:\n  sharp: set this to true or false # generated placeholder\n  esbuild: true\n";
    const approved = mergePnpmBuildApprovals(yaml, ["sharp"]);
    expect(approved).toBe(
      "allowBuilds:\n  sharp: true # generated placeholder\n  esbuild: true\n",
    );
    expect(mergePnpmBuildApprovals(approved, ["sharp"])).toBe(approved);
  });

  it("does not duplicate a decided flow mapping", () => {
    const yaml = "allowBuilds: { sharp: false, esbuild: true }\n";
    expect(mergePnpmBuildApprovals(yaml, ["sharp"])).toBe(yaml);
    const anchored = "allowBuilds: *sharedPolicy\n";
    expect(mergePnpmBuildApprovals(anchored, ["sharp"])).toBe(anchored);
    const unknown = "allowBuilds:\n  sharp: *nativePolicy\n";
    expect(mergePnpmBuildApprovals(unknown, ["sharp"])).toBe(unknown);
  });
});
