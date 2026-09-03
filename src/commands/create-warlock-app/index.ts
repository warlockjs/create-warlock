import { spinner } from "@clack/prompts";
import {
  getDatabaseLabel,
  isNoDatabase,
} from "../../features/database-drivers";
import { App } from "../../helpers/app";
import { CommandResult, takeLastCommandOutput } from "../../helpers/exec";
import {
  getPackageManager,
  runPackageManagerCommand,
} from "../../helpers/package-manager";
import { resolveWarlockVersions } from "../../helpers/warlock-versions";
import { showSuccessScreen } from "../../ui/banner";
import {
  failFatally,
  installFailureHints,
  Problem,
  showNotes,
  showPartialScreen,
  showProblems,
} from "../../ui/report";
import { spinnerMessages } from "../../ui/spinners";

/**
 * What the scaffold actually achieved. `ok` is false when ANY step the user
 * asked for did not happen; the caller turns that into a non-zero exit code so
 * a script never mistakes a half-built project for a finished one.
 */
export type ScaffoldOutcome = {
  ok: boolean;
  problems: Problem[];
};

/** One-line "why did this fail" pulled out of a captured command. */
function reasonFrom(result: CommandResult | undefined): string {
  if (!result) return "the command reported a failure (no output captured)";

  if (result.error) {
    return result.error.message || String(result.error);
  }

  const lastLine = `${result.stderr}\n${result.stdout}`
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .pop();

  const status =
    result.code === null
      ? `killed by ${result.signal ?? "an unknown signal"}`
      : `exit code ${result.code}`;

  return lastLine ? `${status} — ${lastLine}` : status;
}

export async function createWarlockApp(
  application: App,
): Promise<ScaffoldOutcome> {
  const options = application.options;
  const { useGit, useJWT, features, aiProviders, databaseDriver } = options;
  const noDatabase = isNoDatabase(databaseDriver);
  const problems: Problem[] = [];

  // Resolve the versions to pin BEFORE anything is written. The scaffolder's
  // own version is only used when the registry confirms it exists — see
  // helpers/warlock-versions.ts for why an unverified pin broke every install.
  const { versions, notes } = await resolveWarlockVersions();

  // Step 1: Initialize and copy template
  const templateSpinner = spinner();
  templateSpinner.start(spinnerMessages.copyingTemplate);

  try {
    application
      .init()
      .use("warlock")
      .updatePackageJson(versions)
      .updateDotEnv();

    // Wire the chosen database driver into .env — or, when the user opted out,
    // strip the database config entirely so the app boots with no database.
    if (noDatabase) {
      application.removeDatabaseConfig();
    } else {
      application.configureDatabaseEnv(databaseDriver);
    }

    application.configureWebStarter(features.includes("web"));
  } catch (error) {
    templateSpinner.stop(spinnerMessages.templateFailed);

    failFatally({
      step: "Template copy",
      detail: `The project files could not be written: ${(error as Error).message}`,
      hints: [
        "Check that the target directory is writable and that no file is locked by another process.",
      ],
    });
  }

  templateSpinner.stop(spinnerMessages.templateCopied);

  showNotes(notes);

  // Step 2: Install base dependencies (so the `warlock` binary is available).
  // Nothing downstream works without this, so a failure ends the run — loudly,
  // with the command, its exit code and its output.
  const installSpinner = spinner();
  installSpinner.start(spinnerMessages.installingDeps);

  const baseInstall = application.install();
  const baseInstalled = await baseInstall.install;
  const baseInstallResult = await baseInstall.result;

  if (!baseInstalled) {
    installSpinner.stop(spinnerMessages.depsFailed);

    failFatally({
      step: "Dependency install",
      detail: "The project's dependencies were not installed.",
      result: baseInstallResult,
      hints: installFailureHints(baseInstallResult),
    });
  }

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

  // Features the user asked for that are not in the project when we finish.
  const failedFeatures: { feature: string; reason: string }[] = [];

  if (selectedFeatures.length > 0) {
    const featuresSpinner = spinner();
    featuresSpinner.start(spinnerMessages.addingFeatures);

    let addedFeatures = selectedFeatures;

    if (!(await application.installFeatures(selectedFeatures))) {
      // The batch is all-or-nothing, so it cannot say WHICH feature broke it.
      // Retry them one at a time: every feature that can be added still gets
      // added, and every one that cannot gets its own reason.
      const batchFailure = takeLastCommandOutput();

      addedFeatures = [];

      for (const feature of selectedFeatures) {
        if (await application.installFeatures([feature])) {
          addedFeatures.push(feature);
        } else {
          failedFeatures.push({
            feature,
            reason: reasonFrom(takeLastCommandOutput() ?? batchFailure),
          });
        }
      }
    }

    let featureInstall: CommandResult | undefined;

    if (addedFeatures.length > 0) {
      // `warlock add` records the feature dependencies but does not reconcile
      // them with each other. The `web` feature brings `vite` while the
      // template always brings `vitest`, whose own vite range resolves to a
      // different major — two copies, and yarn 1 aborts the whole link phase
      // on them. Pin one copy BEFORE the batched install, not after.
      application.pinViteResolution();

      const install = application.install();
      const installed = await install.install;

      featureInstall = await install.result;

      if (!installed) {
        // The dependencies were recorded but never fetched — the features are
        // not usable, so they are failures, not successes.
        const reason = `their packages were not installed (${reasonFrom(featureInstall)})`;

        for (const feature of addedFeatures) {
          failedFeatures.push({ feature, reason });
        }

        addedFeatures = [];
      }
    }

    if (failedFeatures.length === 0) {
      featuresSpinner.stop(spinnerMessages.featuresAdded);
    } else {
      featuresSpinner.stop(
        addedFeatures.length > 0
          ? spinnerMessages.featuresPartial
          : spinnerMessages.featuresFailed,
      );

      problems.push({
        step: "Features",
        detail: failedFeatures
          .map(({ feature, reason }) => `${feature}: ${reason}`)
          .join("\n     "),
        result: featureInstall?.ok === false ? featureInstall : undefined,
        hints: [
          `Retry inside the project with: npx warlock add ${failedFeatures
            .map(({ feature }) => feature)
            .join(" ")}`,
        ],
      });
    }
  }

  // Step 4: Initialize Git repository if requested
  if (useGit) {
    const gitSpinner = spinner();
    gitSpinner.start(spinnerMessages.initializingGit);

    const initialized = await application.git();

    gitSpinner.stop(
      initialized ? spinnerMessages.gitInitialized : spinnerMessages.gitFailed,
    );

    if (!initialized) {
      const failure = takeLastCommandOutput();

      problems.push({
        step: "Git repository",
        detail: `The repository was not initialized: ${reasonFrom(failure)}`,
        result: failure,
        hints: [
          "Check that git is installed and that user.name / user.email are configured, then run `git init` yourself.",
        ],
      });
    }
  }

  // Step 5: Generate JWT or warm cache
  if (useJWT) {
    const jwtSpinner = spinner();
    jwtSpinner.start(spinnerMessages.generatingJwt);

    const command = runPackageManagerCommand("jwt");
    const generated = await application.exec(command);

    jwtSpinner.stop(
      generated ? spinnerMessages.jwtGenerated : spinnerMessages.jwtFailed,
    );

    if (!generated) {
      const failure = takeLastCommandOutput();

      problems.push({
        step: "JWT secrets",
        detail: `No JWT secrets were written to .env: ${reasonFrom(failure)}`,
        result: failure,
        hints: [`Run \`${command}\` inside the project before starting it.`],
      });
    }
  } else {
    // The warm cache is a start-up optimisation, not something the user asked
    // for: report it, but it does not make the scaffold a failure.
    const warmSpinner = spinner();
    warmSpinner.start(spinnerMessages.warmingCache);

    const warmed = await application.exec("npx warlock --warm-cache");

    warmSpinner.stop(
      warmed ? spinnerMessages.cacheWarmed : spinnerMessages.cacheWarmFailed,
    );

    if (!warmed) takeLastCommandOutput();
  }

  // Step 6: Report what actually happened — the summary may only advertise
  // features that are really in the project.
  const requestedFeatures = [...features, ...aiProviders];
  const missingFeatures = failedFeatures
    .map(({ feature }) => feature)
    .filter(feature => requestedFeatures.includes(feature));
  const installedFeatures = requestedFeatures.filter(
    feature => !missingFeatures.includes(feature),
  );

  if (problems.length > 0) {
    showProblems(problems);

    showPartialScreen({
      projectName: application.name,
      database: getDatabaseLabel(databaseDriver),
      features: installedFeatures,
      missingFeatures,
      packageManager: getPackageManager(),
    });

    return { ok: false, problems };
  }

  showSuccessScreen({
    projectName: application.name,
    database: getDatabaseLabel(databaseDriver),
    features: installedFeatures,
    packageManager: getPackageManager(),
  });

  return { ok: true, problems };
}
