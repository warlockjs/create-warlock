import createNewApp from "./commands/create-new-app";
import { CliFlags } from "./commands/create-new-app/types";

const valueFlags = ["name", "db", "pm", "features", "ai"];

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

export default function createApp() {
  const flags = parseFlags(process.argv.slice(2));

  createNewApp(flags);
}
