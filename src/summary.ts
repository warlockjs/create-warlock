import { colors } from "@mongez/copper";
import { getDatabaseLabel } from "./features/database-drivers";
import { AppOptions } from "./commands/create-new-app/types";

/** What decisions.spec.ts / the terminal actually needs to render the summary. */
export type Decisions = {
  packageManager: string;
  options: AppOptions;
};

/**
 * Print what the scaffolder decided on the user's behalf, and how to change
 * each decision — required because almost every choice is now a default
 * rather than a prompt, so this is the only place a user sees them.
 */
export function printDecisionsSummary({ packageManager, options }: Decisions): void {
  const databaseLabel = getDatabaseLabel(options.databaseDriver);

  const headline = [
    `Using ${packageManager}`,
    `database: ${databaseLabel}`,
    `agent-kit targets: ${options.agents.join(", ")}`,
  ].join(" · ");

  console.log();
  console.log(colors.cyan(headline));
  console.log(
    colors.dim(
      "  change these — package manager: --pm, database: --db/--no-db, agents: --agents, " +
        "features: --features, ai: --ai, git: --git/--no-git, jwt: --jwt/--no-jwt — " +
        "or re-run with --interactive for the full wizard. Package-manager-level choices " +
        "(husky, lint config, etc.) can also be edited directly in the generated project.",
    ),
  );
  console.log();
}
