export type AppOptions = {
  databaseDriver: string;
  databasePort: number;
  features: string[];
  aiProviders: string[];
  useGit: boolean;
  useJWT: boolean;
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
  db?: string;
  features?: string[];
  ai?: string[];
  pm?: string;
  git?: boolean;
  jwt?: boolean;
};
