import { afterEach, describe, expect, it, vi } from "vitest";

import { spinner } from "../src/ui/spinner";

/**
 * The spinner wrapper (`src/ui/spinner.ts`) exists for one reason: `@clack`'s
 * animated spinner floods a NON-TTY log. Its `setInterval` rewrites the line
 * with cursor-move escapes several times a second; on a pipe/CI those escapes
 * do nothing, so every frame is a fresh write. Over a ~21s install step that is
 * hundreds of near-identical lines.
 *
 * These tests pin the contract with the REAL `@clack` spinner (no mock) so that
 * reverting the `isTTY` gate genuinely reproduces the flood.
 */

const originalIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");

function setStdoutTTY(value: boolean | undefined) {
  Object.defineProperty(process.stdout, "isTTY", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();

  if (originalIsTTY) {
    Object.defineProperty(process.stdout, "isTTY", originalIsTTY);
  } else {
    // Node always defines isTTY, but restore defensively.
    setStdoutTTY(undefined);
  }
});

describe("spinner — non-TTY output", () => {
  it("writes at most a start and a stop line, never a frame per tick", () => {
    vi.useFakeTimers();
    setStdoutTTY(undefined);

    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const s = spinner();
    s.start("Summoning dependencies...");

    // Let plenty of animation ticks elapse — an animated spinner would emit a
    // frame (several writes) on each. A quiet one emits nothing here.
    vi.advanceTimersByTime(5000);

    s.stop("Dependencies materialized!");

    // One start line + one stop line. No per-frame writes in between.
    expect(write).toHaveBeenCalledTimes(2);

    const output = write.mock.calls.map(call => String(call[0])).join("");
    const lines = output.split("\n").filter(Boolean);

    expect(lines).toHaveLength(2);
  });

  it("does not accumulate output while a step runs", () => {
    vi.useFakeTimers();
    setStdoutTTY(undefined);

    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const s = spinner();
    s.start("Weaving in your features...");

    vi.advanceTimersByTime(1000);
    const afterOneSecond = write.mock.calls.length;

    vi.advanceTimersByTime(20000);
    const afterTwentyOneSeconds = write.mock.calls.length;

    // Nothing is written by the passage of time itself.
    expect(afterTwentyOneSeconds).toBe(afterOneSecond);
  });

  it("marks a failed stop with a distinct symbol from a successful one", () => {
    setStdoutTTY(undefined);

    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    spinner().stop("Dependencies could not be installed", 1);
    spinner().stop("Dependencies materialized!", 0);

    const [failure, success] = write.mock.calls.map(call => String(call[0]));

    expect(failure).not.toEqual(success);
    expect(failure).toContain("could not be installed");
    expect(success).toContain("materialized");
  });
});

describe("spinner — TTY output", () => {
  it("animates: emits multiple frame writes while a step runs", () => {
    vi.useFakeTimers();
    setStdoutTTY(true);

    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const s = spinner();
    s.start("Summoning dependencies...");

    vi.advanceTimersByTime(1000);

    // A real terminal gets the animation: many writes across the ticks, far
    // more than the two lines a non-TTY would ever produce.
    expect(write.mock.calls.length).toBeGreaterThan(2);

    s.stop("Dependencies materialized!");
  });
});
