export type App = {
  appName?: string;
  appType?: string;
  appPath?: string;
  options?: any;
  pkgManager?: string;
};

export type Application = Required<App>;
