import { spinner } from "@clack/prompts";
import {
  getDatabaseLabel,
  isNoDatabase,
} from "../../features/database-drivers";
import { App } from "../../helpers/app";
import {
  getPackageManager,
  runPackageManagerCommand,
} from "../../helpers/package-manager";
import { showSuccessScreen } from "../../ui/banner";
import { spinnerMessages } from "../../ui/spinners";

export async function createWarlockApp(application: App) {
  const options = application.options;
  const { useGit, useJWT, features, aiProviders, databaseDriver } = options;
  const noDatabase = isNoDatabase(databaseDriver);

  // Step 1: Initialize and copy template
  const templateSpinner = spinner();
  templateSpinner.start(spinnerMessages.copyingTemplate);

  application
    .init()
    .use("warlock")
    .updatePackageJson()
    .updateDotEnv();

  // Wire the chosen database driver into .env — or, when the user opted out,
  // strip the database config entirely so the app boots with no database.
  if (noDatabase) {
    application.removeDatabaseConfig();
  } else {
    application.configureDatabaseEnv(databaseDriver);
  }

  application.configureHomePage(features.includes("react"));

  templateSpinner.stop(spinnerMessages.templateCopied);

  // Step 2: Install base dependencies (so the `warlock` binary is available)
  const installSpinner = spinner();
  installSpinner.start(spinnerMessages.installingDeps);

  await application.install().install;

  installSpinner.stop(spinnerMessages.depsInstalled);

  // Step 3: Add features via `warlock add --no-install`, then one batched install.
  // The DB driver, optional features, and AI providers all go through the single
  // source of truth (core's feature map) so versions never drift. When no
  // database was chosen, the driver is omitted (there is no `none` feature).
  const selectedFeatures = [
    ...(noDatabase ? [] : [databaseDriver]),
    ...features,
    ...aiProviders,
  ];

  if (selectedFeatures.length > 0) {
    const featuresSpinner = spinner();
    featuresSpinner.start(spinnerMessages.addingFeatures);

    const added = await application.installFeatures(selectedFeatures);

    if (added) {
      await application.install().install;
      featuresSpinner.stop(spinnerMessages.featuresAdded);
    } else {
      featuresSpinner.stop(spinnerMessages.featuresFailed);
    }
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
    database: getDatabaseLabel(databaseDriver),
    features: [...features, ...aiProviders],
    packageManager: getPackageManager(),
  });
}
