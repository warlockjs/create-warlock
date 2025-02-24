import { cancel, intro, isCancel, select, text } from "@clack/prompts";
import { colors } from "@mongez/copper";
import { App } from "../../helpers/app";
import {
  getPackageManager,
  setPackageManager,
} from "../../helpers/package-manager";
import { createWarlockApp } from "../create-warlock-app";
import getAppPath from "./get-app-path";
import { App as AppType } from "./types";

const appDetails: Required<AppType> = {
  appName: "",
  appType: "",
  appPath: "",
  pkgManager: "",
  options: {},
};

export default async function createNewApp(createWarlockVersion: string) {
  intro(
    `✨ Let's create a new ${colors.yellowBright("Warlock Js App")} ✨ ${colors.greenBright(`v` + createWarlockVersion)}`,
  );

  const appName = await text({
    message: "Enter the app name",
    placeholder: "warlock-app",
  });

  if (isCancel(appName) || !appName.trim()) {
    cancel("Application name is required to create a new app");
    process.exit(0);
  }

  // Validate the nodejs version to be not less than 20
  const [major] = process.versions.node.split(".").map(Number);

  if (major < 20) {
    cancel("Node.js version must be at least 20.0.0");
    process.exit(0);
  }

  const packageManager = await select({
    message: "Select package manager to use 📦 ",
    initialValue: getPackageManager(),
    options: [
      {
        label: "Npm",
        value: "npm",
      },
      {
        label: "Yarn",
        value: "yarn",
      },
      {
        label: "Pnpm",
        value: "pnpm",
      },
    ],
  });

  setPackageManager(packageManager);

  appDetails.appName = appName;
  appDetails.appPath = getAppPath(appName);
  appDetails.pkgManager = packageManager;

  if (!appDetails.appPath) return;

  appDetails.appType = "warlock";

  createWarlockApp(new App(appDetails));
}
