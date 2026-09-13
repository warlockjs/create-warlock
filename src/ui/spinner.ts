import { spinner as clackSpinner } from "@clack/prompts";
import { colors } from "@mongez/copper";

/**
 * The subset of the spinner surface the scaffolder actually drives: a step is
 * started, optionally re-messaged, and stopped with a success/failure code.
 * Deliberately identical to `@clack/prompts`' spinner so the animated path can
 * be returned as-is on a real terminal.
 */
export type Spinner = {
  /** Begin the step (starts the animation on a TTY). */
  start: (message?: string) => void;
  /** End the step. `code` 0 is success; anything else is a failure. */
  stop: (message?: string, code?: number) => void;
  /** Update the in-flight message (animation-only). */
  message: (message?: string) => void;
};

/**
 * A spinner that animates on a real terminal and stays quiet everywhere else.
 *
 * `@clack/prompts`' spinner drives its animation from a `setInterval` that
 * rewrites the current line several times a second using cursor-move escapes.
 * On a TTY those escapes redraw one line in place. On a NON-TTY (a pipe, CI, an
 * agent harness) `process.stdout.isTTY` is `undefined` and the escapes do
 * nothing, so every frame lands as a fresh chunk of output: a single ~21s
 * install step alone buries the log under hundreds of near-identical lines.
 *
 * The animation is a courtesy for a human watching a live terminal; it has no
 * value in a captured log. So on a non-TTY we skip the frame loop entirely and
 * print exactly one line when the step starts and one when it stops — the
 * progress stays legible without the flood. See `specs/spinner.spec.ts`.
 */
export function spinner(): Spinner {
  if (process.stdout.isTTY) {
    return clackSpinner();
  }

  // Match @clack's own message hygiene: it strips a trailing "..." because the
  // animated dots stand in for it. Our static lines carry no dots, so drop them.
  const clean = (message = ""): string => message.replace(/\.+$/, "");

  return {
    start(message = "") {
      process.stdout.write(`${colors.magenta("○")} ${clean(message)}\n`);
    },
    stop(message = "", code = 0) {
      const symbol = code === 0 ? colors.green("✓") : colors.red("✖");

      process.stdout.write(`${symbol} ${clean(message)}\n`);
    },
    message() {
      // Intermediate messages exist only to animate the live line. On a non-TTY
      // the start and stop lines already tell the whole story, so this is a
      // deliberate no-op — the alternative is one extra line per update, which
      // is exactly the flood this module exists to prevent.
    },
  };
}
