declare module "which-pm-runs" {
  function detectPackageManager():
    | {
        name: "npm" | "yarn" | "pnpm";
        version: string;
      }
    | undefined;
  export = detectPackageManager;
}
