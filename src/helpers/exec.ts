import { log } from "@clack/prompts";
import { colors } from "@mongez/copper";
import { ChildProcess } from "child_process";
import { default as childProcess, default as spawn } from "cross-spawn";

/**
 * The full outcome of a spawned command — everything a human needs to act on a
 * failure: what ran, where, how it ended, and what it printed.
 *
 * Every runner in this file produces one. A boolean is never enough: "it
 * failed" with no command, no exit code and no stderr is exactly how a broken
 * scaffold gets announced as a success.
 */
export type CommandResult = {
  /** Whether the command exited cleanly (code 0, no spawn error). */
  ok: boolean;
  /** The command as typed, e.g. `npm install`. */
  command: string;
  /** Directory the command ran in, when known. */
  cwd?: string;
  /** Exit code, or `null` when the process was signalled / never spawned. */
  code: number | null;
  /** Terminating signal, when the process was killed. */
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  /** Set when the process could not be spawned at all (ENOENT, EACCES, ...). */
  error?: Error;
};

/** Options accepted by the capturing runners. */
export type RunOptions = {
  /** Extra environment for the child; merged over `process.env`. */
  env?: NodeJS.ProcessEnv;
};

/**
 * The last command executed through {@link executeCommand}.
 *
 * `executeCommand` resolves a bare boolean (a contract several callers depend
 * on), so the *reason* a command failed would otherwise be lost. It is parked
 * here and claimed with {@link takeLastCommandOutput}, which clears it — a
 * caller can never accidentally attribute a stale failure to the wrong step.
 *
 * The scaffolder runs one command at a time, so a single slot is enough.
 */
let lastCommandOutput: CommandResult | undefined;

/**
 * Claim (and clear) the output of the most recent {@link executeCommand} call.
 */
export function takeLastCommandOutput(): CommandResult | undefined {
  const output = lastCommandOutput;

  lastCommandOutput = undefined;

  return output;
}

/**
 * Keep only the last `lines` non-empty lines of a stream — enough context to
 * act on, without dumping a 500-line npm log over the wizard.
 */
export function tail(text: string, lines = 12): string {
  return text
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .slice(-lines)
    .join("\n");
}

export default async function exec(command: string, options: any = {}) {
  const [commandName, ...optionsList] = command.split(" ");

  const commandOutput = childProcess.sync(commandName, optionsList, options);

  // it means command didn't end as expected, then stop the rest of the program
  if (commandOutput.error !== null) {
    process.exit(1);
  }

  return commandOutput;
}

/**
 * Attach stdout/stderr collectors to a child and return the accumulated text.
 *
 * The streams are optional on purpose: a child spawned with `stdio: "ignore"`
 * (or a test double) exposes none.
 */
function collectOutput(child: ChildProcess) {
  const chunks = { stdout: "", stderr: "" };

  child.stdout?.on("data", data => {
    chunks.stdout += String(data);
  });

  child.stderr?.on("data", data => {
    chunks.stderr += String(data);
  });

  return chunks;
}

function logSpawnError(error: unknown) {
  if (!error) return;

  const message = (error as Error)?.message;

  log.error(colors.red(String(message ?? error)) + `\n\n`);
}

/**
 * This function directly executes a command
 *
 * Resolves a boolean for backwards compatibility; the full outcome (exit code
 * and captured output) is available to the caller via
 * {@link takeLastCommandOutput}.
 */
export async function executeCommand(cmd: string, args: string[], cwd: string) {
  const result = await runCapturedCommand(cmd, args, cwd);

  lastCommandOutput = result;

  return result.ok;
}

/**
 * Run a command to completion and resolve its full {@link CommandResult}.
 *
 * Output is piped and captured rather than discarded — the whole point is that
 * a failure can be explained instead of merely announced.
 */
export function runCapturedCommand(
  cmd: string,
  args: string[],
  cwd: string,
  options: RunOptions = {},
): Promise<CommandResult> {
  return new Promise<CommandResult>(resolve => {
    const command = [cmd, ...args].join(" ");

    const settle = (result: Partial<CommandResult>): void =>
      resolve({
        ok: false,
        command,
        cwd,
        code: null,
        signal: null,
        stdout: "",
        stderr: "",
        ...result,
      });

    let child: ChildProcess;

    try {
      child = spawn(cmd, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: options.env ? { ...process.env, ...options.env } : process.env,
      });
    } catch (error) {
      logSpawnError(error);

      return settle({ error: error as Error, stderr: String(error) });
    }

    const output = collectOutput(child);

    child.on("error", error => {
      logSpawnError(error);

      settle({
        error: error as Error,
        stdout: output.stdout,
        stderr: output.stderr || String((error as Error)?.message ?? error),
      });
    });

    child.on("close", (code, signal) => {
      settle({
        ok: code === 0,
        code,
        signal,
        stdout: output.stdout,
        stderr: output.stderr,
      });
    });
  });
}

/**
 * Run a long command with an abort handle.
 *
 * `install` stays a `Promise<boolean>` for existing callers; `result` carries
 * the exit code and the captured output so a failing install can be reported
 * with the command, its status and its stderr instead of a shrug.
 */
export function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  options: RunOptions = {},
) {
  let child: ChildProcess;

  const result = new Promise<CommandResult>(resolve => {
    const command = [cmd, ...args].join(" ");

    const settle = (partial: Partial<CommandResult>): void =>
      resolve({
        ok: false,
        command,
        cwd,
        code: null,
        signal: null,
        stdout: "",
        stderr: "",
        ...partial,
      });

    try {
      child = spawn(cmd, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: options.env ? { ...process.env, ...options.env } : process.env,
      });

      const output = collectOutput(child);

      child.on("error", error => {
        logSpawnError(error);

        settle({
          error: error as Error,
          stdout: output.stdout,
          stderr: output.stderr || String((error as Error)?.message ?? error),
        });
      });

      child.on("close", (code, signal) => {
        settle({
          ok: code === 0,
          code,
          signal,
          stdout: output.stdout,
          stderr: output.stderr,
        });
      });
    } catch (error) {
      settle({ error: error as Error, stderr: String(error) });
    }
  });

  const abort = async () => {
    if (child) {
      child.kill("SIGINT");
    }
  };

  return { abort, install: result.then(outcome => outcome.ok), result };
}
