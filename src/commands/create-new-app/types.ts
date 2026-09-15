/** The one structural fork that changes the generated app's shape. */
export type Stack = "api" | "web";

export type AppOptions = {
  databaseDriver: string;
  databasePort: number;
  features: string[];
  aiProviders: string[];
  useGit: boolean;
  useJWT: boolean;
  /** `agent-kit` targets to derive per-agent docs/skills for. Default: `["claude"]`. */
  agents: string[];
};

export type App = {
  appName?: string;
  appType?: string;
  appPath?: string;
  options?: AppOptions;
  pkgManager?: string;
};

export type Application = Required<App>;

/**
 * Flags parsed from the command line for non-interactive scaffolding
 * (`create-warlock my-app --db=postgres --features=test,herald --ai=openai --yes`).
 */
export type CliFlags = {
  yes?: boolean;
  name?: string;
  /** The one structural question the default path asks: API-only or full-stack web. */
  stack?: Stack;
  db?: string;
  features?: string[];
  ai?: string[];
  pm?: string;
  /** `agent-kit` targets for `--agents`. Comma-separated on the CLI. */
  agents?: string[];
  git?: boolean;
  jwt?: boolean;
  /** `--interactive` / `--customize` — restore the full long-form prompt flow. */
  interactive?: boolean;
  /** `-h` / `--help` — print usage and exit before any scaffolding runs. */
  help?: boolean;
  /** `-v` / `--version` — print the installed version and exit. */
  version?: boolean;
};
