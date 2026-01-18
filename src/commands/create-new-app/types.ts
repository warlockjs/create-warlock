export type AppOptions = {
  databaseDriver: string;
  databasePort: number;
  features: string[];
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
