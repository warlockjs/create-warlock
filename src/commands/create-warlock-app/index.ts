import { spinner } from "@clack/prompts";
import { App } from "../../helpers/app";
import {
  getPackageManager,
  runPackageManagerCommand,
} from "../../helpers/package-manager";
import { showSuccessScreen } from "../../ui/banner";
import { spinnerMessages } from "../../ui/spinners";

export async function createWarlockApp(application: App) {
  const options = application.options;
  const { useGit, useJWT, features, databaseDriver } = options;

  // Step 1: Initialize and copy template
  const templateSpinner = spinner();
  templateSpinner.start(spinnerMessages.copyingTemplate);

  application
    .init()
    .use("warlock")
    .updatePackageJson()
    .updateDotEnv()
    .addDatabaseDriver(databaseDriver)
    .addFeatures(features);

  templateSpinner.stop(spinnerMessages.templateCopied);

  // Step 2: Install dependencies
  const installSpinner = spinner();
  installSpinner.start(spinnerMessages.installingDeps);

  const installProcess = application.install();
  await installProcess.install;

  installSpinner.stop(spinnerMessages.depsInstalled);

  // Step 3: Configure features (copy config stubs)
  if (features.length > 0) {
    const configSpinner = spinner();
    configSpinner.start(spinnerMessages.configuringFeatures);

    application.copyConfigStubs();

    configSpinner.stop(spinnerMessages.featuresConfigured);
  }

  // Step 4: Initialize Git repository if requested
  if (useGit) {
    const gitSpinner = spinner();
    gitSpinner.start(spinnerMessages.initializingGit);

    await application.git();

    gitSpinner.stop(spinnerMessages.gitInitialized);
  }

  // Step 5: Generate JWT or warm cache
  if (useJWT) {
    const jwtSpinner = spinner();
    jwtSpinner.start(spinnerMessages.generatingJwt);

    await application.exec(runPackageManagerCommand("jwt"));

    jwtSpinner.stop(spinnerMessages.jwtGenerated);
  } else {
    const warmSpinner = spinner();
    warmSpinner.start(spinnerMessages.warmingCache);

    await application.exec("npx warlock --warm-cache");

    warmSpinner.stop(spinnerMessages.cacheWarmed);
  }

  // Step 6: Show success screen
  showSuccessScreen({
    projectName: application.name,
    database: databaseDriver === "mongodb" ? "MongoDB" : "PostgreSQL",
    features: features,
    packageManager: getPackageManager(),
  });
}
