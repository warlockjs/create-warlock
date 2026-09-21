import {
  getAiPackageOptions,
  getAiProviderOptions,
} from "../features/features-map";

/**
 * Single source of truth for every CLI flag's help text and default, so
 * `--help` can never drift out of sync with what the parser actually
 * understands (requirement: `--help` lists every flag together with its
 * default value).
 */
export type FlagDefinition = {
  /** How the flag reads on the command line, e.g. `--db=<driver>`. */
  usage: string;
  description: string;
  /** Human-readable default, or what happens when it is left unanswered. */
  defaultValue: string;
};

const AI_FEATURE_KEYS = [
  ...getAiProviderOptions(),
  ...getAiPackageOptions(),
].map(({ value }) => value);

export const FLAG_DEFINITIONS: FlagDefinition[] = [
  {
    usage: "--name=<name>",
    description: "Project name (or pass it as the first positional arg)",
    defaultValue:
      "required — prompted if a TTY is available, otherwise fails naming this flag",
  },
  {
    usage: "--stack=<api|web>",
    description:
      "API-only or full-stack web — the one structural choice that changes the app's shape. Customizing everything else is a flow, not a stack: use --customize, where --stack=web arrives as a pre-ticked web feature",
    defaultValue: "api",
  },
  {
    usage: "--db=<driver> / --no-db",
    description:
      "Database driver (e.g. postgres, mongodb), or skip a database entirely",
    defaultValue: "mongodb",
  },
  {
    usage: "--features=<list>",
    description: "Comma-separated feature keys (e.g. test,herald)",
    defaultValue:
      'none (or ["web"] when --stack=web and --features is not given)',
  },
  {
    usage: "--ai=<list>",
    description: `Comma-separated AI provider or capability keys (${AI_FEATURE_KEYS.join(", ")})`,
    defaultValue: "none",
  },
  {
    usage: "--pm=<manager>",
    description: "Package manager to use (npm, yarn, pnpm, bun)",
    defaultValue:
      "inferred from the invoking agent (npm_config_user_agent) or the system",
  },
  {
    usage: "--agents=<list>",
    description: "Comma-separated agent-kit targets to derive docs/skills for",
    defaultValue: "claude",
  },
  {
    usage: "--git / --no-git",
    description: "Force-enable or force-disable git initialization",
    defaultValue: "false",
  },
  {
    usage: "--jwt / --no-jwt",
    description: "Force-enable or force-disable JWT secret generation",
    defaultValue: "false",
  },
  {
    usage: "-y, --yes",
    description: "Skip every prompt and accept defaults for anything unset",
    defaultValue: "false",
  },
  {
    usage: "--customize, --interactive",
    description:
      'Full long-form wizard — every choice asked one by one. Also selectable as "Customize" in the "What are we building?" menu. Any other flag you pass pre-selects its prompt; --yes is refused',
    defaultValue: "false",
  },
  {
    usage: "-h, --help",
    description: "Show this help message and exit",
    defaultValue: "n/a",
  },
  {
    usage: "-v, --version",
    description: "Show the installed create-warlock version and exit",
    defaultValue: "n/a",
  },
];

/** Render the full `--help` text, one line per flag with its default. */
export function buildHelpText(): string {
  const rows = FLAG_DEFINITIONS.map(({ usage, description, defaultValue }) => {
    const label = usage.padEnd(28);
    return `    ${label}${description} (default: ${defaultValue})`;
  }).join("\n");

  return `
  create-warlock — scaffold a new Warlock.js project

  Usage
    $ create-warlock [project-name] [options]

  Options
${rows}

  Example
    $ create-warlock my-app --db=postgres --features=test,herald --yes
`;
}
