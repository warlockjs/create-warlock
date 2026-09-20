import { cancel, isCancel, select } from "@clack/prompts";
import type { SetupChoice } from "../commands/create-new-app/types";

/**
 * The ONE structural question the default (non-`--interactive`) interactive
 * path is allowed to ask: does the generated app need server-rendered web
 * pages, or is it an API only? This is the sole fork that changes the shape
 * of the generated project — every other choice (database, features,
 * package manager, agent-kit targets, …) is reversible within minutes and
 * ships as a flag with a default instead.
 *
 * The third entry is not a third stack: `customize` selects the FLOW, handing
 * the run to the full wizard (`--customize`) so every one of those reversible
 * choices gets asked instead of defaulted. It sits in this menu because a flag
 * nobody is told about is a feature nobody has.
 */
export async function askStack(): Promise<SetupChoice> {
  const answer = await select({
    message: "What are we building?",
    options: [
      {
        value: "api",
        label: "API only",
        hint: "A REST API, no server-rendered pages",
      },
      {
        value: "web",
        label: "Full-stack web",
        hint: "API + server-rendered React pages (SSR)",
      },
      {
        value: "customize",
        label: "Customize",
        hint: "Pick package manager, database, features and AI providers one by one",
      },
    ],
    initialValue: "api",
  });

  if (isCancel(answer)) {
    cancel("Setup cancelled");
    process.exit(0);
  }

  return answer as SetupChoice;
}
