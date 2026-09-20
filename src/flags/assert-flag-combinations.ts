import { cancel } from "@clack/prompts";
import type { CliFlags } from "../commands/create-new-app/types";
import { hasInteractiveStdin } from "../helpers/tty";

/**
 * `--customize` asks for the opposite of what `--yes`, a non-TTY stdin and
 * `--stack` supply. Every one of those contradictions used to resolve in
 * SILENCE — `--yes` simply won, the wizard never ran, and the run looked like
 * it had succeeded — which is the worst available outcome: the developer never
 * learns their flag was dropped. Refuse each combination instead, naming both
 * flags so the message says what to do next.
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

  if (cli.stack) {
    cancel(
      "--customize and --stack contradict each other: the wizard asks which features to include itself, so --stack would be silently dropped. Pass one or the other.",
    );
    process.exit(1);
  }
}
