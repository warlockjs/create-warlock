/**
 * Whether stdin is attached to an interactive terminal.
 *
 * A scaffolder spawned by CI, a script, or an agent harness has no TTY on
 * stdin — `process.stdin.isTTY` is `undefined` there. Prompting anyway does
 * not fail cleanly: `@clack/prompts` tries to put a non-existent terminal
 * into raw mode and Node's libuv layer throws `TTY initialization failed:
 * uv_tty_init returned EBADF (bad file descriptor)` before a single file is
 * written. That is an internal implementation detail leaking to a developer
 * whose only mistake was not being at a keyboard.
 *
 * Isolated in its own module (rather than read inline) so tests can mock the
 * non-interactive case without spawning a real detached process every time.
 */
export function hasInteractiveStdin(): boolean {
  return Boolean(process.stdin.isTTY);
}
