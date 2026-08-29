import { getJsonFile } from "@warlock.js/fs";
import createNewApp from "./commands/create-new-app";
import { CliFlags } from "./commands/create-new-app/types";
import { NO_DATABASE } from "./features/database-drivers";
import { packageRoot } from "./helpers/paths";

const valueFlags = ["name", "db", "pm", "features", "ai"];

const HELP_TEXT = `
  create-warlock — scaffold a new Warlock.js project

  Usage
    $ create-warlock [project-name] [options]

  Options
    --name              Project name (or pass it as the first positional arg)
    --db=<driver>        Database driver (e.g. postgres, mongodb)
    --no-db               Skip database selection entirely
    --features=<list>    Comma-separated feature keys (e.g. test,herald)
    --ai=<list>           Comma-separated AI provider keys (e.g. openai,anthropic)
    --pm=<manager>        Package manager to use (npm, yarn, pnpm)
    --git / --no-git      Force-enable or force-disable git initialization
    --jwt / --no-jwt      Force-enable or force-disable JWT secret generation
    -y, --yes             Skip prompts and accept defaults for anything unset
    -h, --help            Show this help message and exit
    -v, --version         Show the installed create-warlock version and exit

  Example
    $ create-warlock my-app --db=postgres --features=test,herald --yes
`;

/**
 * Parse the scaffolder's own CLI flags for non-interactive mode.
 *
 * @example
 * create-warlock my-app --db=postgres --features=test,herald --ai=openai,anthropic --yes
 */
export function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }

    const equalIndex = arg.indexOf("=");
    const key = (equalIndex === -1 ? arg : arg.slice(0, equalIndex)).replace(/^-+/, "");
    let value: string | undefined = equalIndex === -1 ? undefined : arg.slice(equalIndex + 1);

    // Value-taking flags may use either `--key=value` or `--key value`.
    if (valueFlags.includes(key) && value === undefined) {
      const next = argv[i + 1];

      if (next && !next.startsWith("-")) {
        value = next;
        i++;
      }
    }

    switch (key) {
      case "help":
      case "h":
        flags.help = true;
        break;
      case "version":
      case "v":
        flags.version = true;
        break;
      case "yes":
      case "y":
        flags.yes = true;
        break;
      case "git":
        flags.git = true;
        break;
      case "no-git":
        flags.git = false;
        break;
      case "jwt":
        flags.jwt = true;
        break;
      case "no-jwt":
        flags.jwt = false;
        break;
      case "name":
        flags.name = value;
        break;
      case "db":
        flags.db = value;
        break;
      case "no-db":
        // Opt out of a database entirely — equivalent to `--db=none`.
        flags.db = NO_DATABASE;
        break;
      case "pm":
        flags.pm = value;
        break;
      case "features":
        flags.features = splitList(value);
        break;
      case "ai":
        flags.ai = splitList(value);
        break;
    }
  }

  if (!flags.name && positionals.length > 0) {
    flags.name = positionals[0];
  }

  return flags;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

/**
 * Read this package's own `version` field. A plain JSON read — no network
 * call, no write, nothing else touched — so `--version` stays a pure,
 * side-effect-free exit.
 */
export function packageVersion(): string {
  return (getJsonFile(packageRoot("package.json")) as { version: string })
    .version;
}

export default function createApp() {
  const flags = parseFlags(process.argv.slice(2));

  // `--help` and `--version` must exit before anything that touches the
  // filesystem, the network, or a prompt — they win over every other flag,
  // including a positional project name.
  if (flags.help) {
    console.log(HELP_TEXT);
    process.exit(0);
    return;
  }

  if (flags.version) {
    console.log(packageVersion());
    process.exit(0);
    return;
  }

  // An unexpected throw must surface as a readable error AND a non-zero exit
  // code — never as a stack trace the user scrolls past on the way to a green
  // banner (there is no banner after this point).
  Promise.resolve(createNewApp(flags)).catch((error: unknown) => {
    console.error();
    console.error(
      `  create-warlock failed: ${(error as Error)?.message ?? String(error)}`,
    );
    console.error();

    process.exit(1);
  });
}
