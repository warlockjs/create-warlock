import {
  cancel,
  confirm,
  isCancel,
  multiselect,
  select,
  text,
} from "@clack/prompts";
import { colors } from "@mongez/copper";
import { getJsonFile } from "@mongez/fs";
import {
  getDatabaseDriver,
  getDatabaseDriverOptions,
} from "../../features/database-drivers";
import { getFeatureOptions } from "../../features/features-map";
import { App } from "../../helpers/app";
import {
  detectPackageManagers,
  getPackageManager,
  getPreferredPackageManager,
  getSystemPackageManagers,
  setPackageManager,
} from "../../helpers/package-manager";
import { packageRoot } from "../../helpers/paths";
import { showIntroBanner } from "../../ui/banner";
import { createWarlockApp } from "../create-warlock-app";
import getAppPath from "./get-app-path";
import { App as AppType } from "./types";

export default async function createNewApp() {
  // Start detecting package managers in the background to avoid delay later
  const pmDetectionPromise = detectPackageManagers();

  // Get version from package.json
  const packageJson: any = getJsonFile(packageRoot("package.json"));
  const createWarlockVersion = packageJson.version;

  // Show the intro banner
  showIntroBanner(createWarlockVersion);

  console.log(colors.cyan("✨ Let's create something magical! ✨\n"));

  // Validate Node.js version (minimum v20)
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 20) {
    cancel("Node.js version must be at least 20.0.0");
    process.exit(0);
  }

  // Step 1: Project name
  const appName = await text({
    message: "What shall we call your project?",
    placeholder: "my-warlock-app",
  });

  if (isCancel(appName) || !appName.trim()) {
    cancel("A project name is required to continue");
    process.exit(0);
  }

  const appPath = getAppPath(appName);
  if (!appPath) return;

  // Step 2: Package Manager selection
  await pmDetectionPromise; // Ensure detection is complete

  const packageManager = await select({
    message: "Which package manager do you want to use?",
    options: getSystemPackageManagers().map(pm => ({
      value: pm,
      label: pm,
    })),
    initialValue: getPreferredPackageManager(),
  });

  if (isCancel(packageManager)) {
    cancel("Package manager selection cancelled");
    process.exit(0);
  }

  setPackageManager(packageManager as string);

  // Step 3: Database driver selection
  const databaseDriver = await select({
    message: "Choose your database driver 🗄️",
    options: getDatabaseDriverOptions(),
  });

  if (isCancel(databaseDriver)) {
    cancel("Database selection cancelled");
    process.exit(0);
  }

  const selectedDriver = getDatabaseDriver(databaseDriver as string);

  // Step 4: Features selection
  const selectedFeatures = await multiselect({
    message: "Select optional features to include ✨",
    options: getFeatureOptions(),
    required: false,
  });

  if (isCancel(selectedFeatures)) {
    cancel("Feature selection cancelled");
    process.exit(0);
  }

  // Step 5: Git initialization
  const useGit =
    (await confirm({
      message: "Initialize a Git repository? 📂",
    })) === true;

  if (isCancel(useGit)) {
    cancel("Setup cancelled");
    process.exit(0);
  }

  // Step 6: JWT secret generation
  const useJWT =
    (await confirm({
      message: "Generate JWT secret keys? 🔐",
    })) === true;

  if (isCancel(useJWT)) {
    cancel("Setup cancelled");
    process.exit(0);
  }

  // Build app details
  const appDetails: Required<AppType> = {
    appName: appName,
    appType: "warlock",
    appPath: appPath,
    pkgManager: getPackageManager(),
    options: {
      databaseDriver: databaseDriver as string,
      databasePort: selectedDriver?.defaultPort || 27017,
      features: selectedFeatures as string[],
      useGit,
      useJWT,
    },
  };

  // Create the app
  await createWarlockApp(new App(appDetails));
}
