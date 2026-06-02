import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getIntroBanner,
  getSuccessScreen,
  showIntroBanner,
  showSuccessScreen,
} from "../src/ui/banner";

/**
 * Strip every ANSI SGR escape so the box-drawing assertions can reason about the
 * VISIBLE characters only — `@mongez/copper` wraps each fragment in colour codes
 * that would otherwise drown the layout checks.
 */
// eslint-disable-next-line no-control-regex
const ansi = /\x1b\[[0-9;]*m/g;

function visible(text: string): string {
  return text.replace(ansi, "");
}

describe("getIntroBanner", () => {
  it("renders the version with a leading v inside the banner", () => {
    const banner = visible(getIntroBanner("4.0.114"));

    expect(banner).toContain("v4.0.114");
    expect(banner).toContain("WARLOCK.JS");
    expect(banner).toContain("The Magical Node.js Framework");
  });

  it("keeps the box frame intact for a short version string", () => {
    const banner = visible(getIntroBanner("1.0.0"));

    // The top and bottom rounded corners must both be present and the box must
    // be closed on every content line (no ragged right edge).
    expect(banner).toContain("╭");
    expect(banner).toContain("╮");
    expect(banner).toContain("╰");
    expect(banner).toContain("╯");
  });

  it("pads the version line to a fixed inner width regardless of version length", () => {
    // The padding is `totalWidth - 3 - versionLine.length`; a longer version
    // must still produce a non-negative pad (no RangeError from repeat()).
    const short = visible(getIntroBanner("1"));
    const long = visible(getIntroBanner("10.20.30"));

    const shortVersionLine = short
      .split("\n")
      .find((line) => line.includes("v1") && line.includes("│"));
    const longVersionLine = long
      .split("\n")
      .find((line) => line.includes("v10.20.30") && line.includes("│"));

    expect(shortVersionLine).toBeTruthy();
    expect(longVersionLine).toBeTruthy();

    // Both version lines are bounded by the same box borders, so their visible
    // widths line up to the millimetre.
    expect(shortVersionLine!.length).toBe(longVersionLine!.length);
  });
});

describe("getSuccessScreen", () => {
  it("summarises project, database and feature list", () => {
    const screen = visible(
      getSuccessScreen({
        projectName: "my-app",
        database: "MongoDB",
        features: ["test", "redis"],
        packageManager: "yarn",
      }),
    );

    expect(screen).toContain("my-app");
    expect(screen).toContain("MongoDB");
    expect(screen).toContain("test, redis");
    expect(screen).toContain("YOUR PROJECT IS READY");
  });

  it("prints `none` when no features were selected", () => {
    const screen = visible(
      getSuccessScreen({
        projectName: "bare",
        database: "PostgreSQL",
        features: [],
        packageManager: "pnpm",
      }),
    );

    expect(screen).toContain("none");
  });

  it("uses `npm run dev` as the next-step command only for npm", () => {
    const npmScreen = visible(
      getSuccessScreen({
        projectName: "app",
        database: "MongoDB",
        features: [],
        packageManager: "npm",
      }),
    );

    expect(npmScreen).toContain("npm run dev");
    expect(npmScreen).not.toContain("npm dev");
  });

  it("uses `<pm> dev` directly for yarn and pnpm", () => {
    const yarnScreen = visible(
      getSuccessScreen({
        projectName: "app",
        database: "MongoDB",
        features: [],
        packageManager: "yarn",
      }),
    );
    const pnpmScreen = visible(
      getSuccessScreen({
        projectName: "app",
        database: "MongoDB",
        features: [],
        packageManager: "pnpm",
      }),
    );

    expect(yarnScreen).toContain("yarn dev");
    expect(pnpmScreen).toContain("pnpm dev");
  });

  it("echoes the project name in the `cd` next step", () => {
    const screen = visible(
      getSuccessScreen({
        projectName: "shop-api",
        database: "MongoDB",
        features: [],
        packageManager: "yarn",
      }),
    );

    expect(screen).toContain("cd shop-api");
  });

  it("grows the box to fit a long feature list without truncating it", () => {
    const longFeatures = [
      "react",
      "react-email",
      "mail",
      "ses",
      "image",
      "s3",
      "redis",
    ];

    const screen = visible(
      getSuccessScreen({
        projectName: "app",
        database: "MongoDB",
        features: longFeatures,
        packageManager: "yarn",
      }),
    );

    // The full joined list survives — the dynamic width widens to hold it.
    expect(screen).toContain(longFeatures.join(", "));
  });

  it("keeps the success box right-aligned (every content row closes with │)", () => {
    const screen = getSuccessScreen({
      projectName: "alignment-check",
      database: "PostgreSQL",
      features: ["socket"],
      packageManager: "yarn",
    });

    // Take the box rows (those carrying the vertical border), strip colour, and
    // confirm each one ends with the closing border once trailing spaces of the
    // template indentation are ignored.
    const rows = visible(screen)
      .split("\n")
      .map((line) => line.replace(/\s+$/, ""))
      .filter((line) => line.includes("│"));

    expect(rows.length).toBeGreaterThan(3);

    for (const row of rows) {
      expect(row.endsWith("│")).toBe(true);
    }
  });

  it("renders a stable-width box: top and bottom borders share the same length", () => {
    const screen = visible(
      getSuccessScreen({
        projectName: "widths",
        database: "MongoDB",
        features: ["test"],
        packageManager: "yarn",
      }),
    );

    const top = screen.split("\n").find((line) => line.includes("╭"));
    const bottom = screen.split("\n").find((line) => line.includes("╰"));

    expect(top).toBeTruthy();
    expect(bottom).toBeTruthy();
    expect(top!.length).toBe(bottom!.length);
  });
});

describe("console wrappers", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("showIntroBanner prints the logo, wordmark and version box", () => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    showIntroBanner("2.3.4");

    // logo + wordmark + framed banner = three writes.
    expect(logSpy).toHaveBeenCalledTimes(3);
    const printed = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(printed).toContain("v2.3.4");
  });

  it("showSuccessScreen prints the rendered summary once", () => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    showSuccessScreen({
      projectName: "printed",
      database: "MongoDB",
      features: ["test"],
      packageManager: "yarn",
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0][0])).toContain("printed");
  });
});
