import { cancel } from "@clack/prompts";
import type { CliFlags } from "../commands/create-new-app/types";
import { hasInteractiveStdin } from "../helpers/tty";

/**
 * `--customize` asks for the opposite of what `--yes` and a non-TTY stdin
 * supply, and both contradictions used to resolve in SILENCE: `--yes` simply
 * won the branch, the wizard never ran, and the run looked like it had
 * succeeded while asking none of the questions the flag was passed for.
 *
 * Every OTHER flag is not a contradiction — it is an answer given early, and
 * the wizard pre-selects it rather than dropping it. See `seedFromFlags`.
 *
 * Called before any prompt and before the non-interactive branch, so a refusal
 * happens with no app directory created.
 */
export function assertFlagCombinations(cli: CliFlags): void {
  if (!cli.interactive) return;

  if (cli.yes) {
    cancel(
      "--customize and --yes contradict each other: --customize asks every question, --yes answers them all with defaults. Pass one or the other.",
    );
    process.exit(1);
  }

  if (!hasInteractiveStdin()) {
    cancel(
      "--customize needs an interactive terminal to ask its questions, and stdin is not a TTY. Either run it in a terminal, or drop --customize and pass the answers as flags — see --help.",
    );
    process.exit(1);
  }
}
