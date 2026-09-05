import {
  cancel,
  confirm,
  isCancel,
  multiselect,
  select,
  text,
} from "@clack/prompts";
import { colors } from "@mongez/copper";
import { getJsonFile } from "@warlock.js/fs";
import {
  getDatabaseDriver,
  getDatabaseDriverOptions,
  isNoDatabase,
} from "../../features/database-drivers";
import {
  getAiPackageOptions,
  getAiProviderOptions,
  getAllFeatureKeys,
  getDefaultFeatureKeys,
  getFeatureOptions,
} from "../../features/features-map";
import { App } from "../../helpers/app";
import {
  ALLOWED_PACKAGE_MANAGERS,
  detectPackageManagers,
  getPackageManager,
  getPreferredPackageManager,
  getSystemPackageManagers,
  isValidPackageManager,
  setPackageManager,
} from "../../helpers/package-manager";
import { packageRoot } from "../../helpers/paths";
import { hasInteractiveStdin } from "../../helpers/tty";
import { showIntroBanner } from "../../ui/banner";
import { createWarlockApp } from "../create-warlock-app";
import getAppPath from "./get-app-path";
import { AppOptions, App as AppType, CliFlags } from "./types";

export default async function createNewApp(cli: CliFlags = {}) {
  // Start detecting package managers in the background to avoid delay later
  const pmDetectionPromise = detectPackageManagers();

  // Get version from package.json
  const packageJson: any = getJsonFile(packageRoot("package.json"));
  const createWarlockVersion = packageJson.version;

  // Show the intro banner
  showIntroBanner(createWarlockVersion);

  console.log(colors.cyan("Let's create something magical! \n"));

  // Validate Node.js version (minimum v20)
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 20) {
    cancel("Node.js version must be at least 20.0.0");
    process.exit(0);
  }

  // Non-interactive path: build everything from flags and skip the prompts.
  //
  // Triggered by --yes, OR automatically the moment stdin has no TTY — CI, a
  // script, an agent harness. This check MUST run before the first prompt
  // call: attempting `text()`/`select()` on a non-TTY stdin does not fail
  // cleanly, it crashes with a libuv internal ("TTY initialization failed:
  // uv_tty_init returned EBADF") before any app directory exists, no matter
  // how the run was invoked.
  //
  // Prompting is the fallback, not the precondition: a project name is the
  // only answer with no sane default, so when a name is already available
  // (positional arg or --name) the run proceeds exactly as --yes would, TTY
  // or not. When the name is ALSO missing and there is no TTY to ask for one,
  // createNonInteractive fails loudly — naming --yes and every non-interactive
  // flag — instead of ever reaching a prompt. Every other prompt already has a
  // default; see resolveNonInteractiveOptions below for the full table.
  if (cli.yes || !hasInteractiveStdin()) {
    await createNonInteractive(cli);
    return;
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
    message: "Choose your database driver",
    options: getDatabaseDriverOptions(),
  });

  if (isCancel(databaseDriver)) {
    cancel("Database selection cancelled");
    process.exit(0);
  }

  const selectedDriver = getDatabaseDriver(databaseDriver as string);

  // Step 4: Features selection
  const selectedFeatures = await multiselect({
    message: "Select optional features to include",
    options: getFeatureOptions(),
    initialValues: getDefaultFeatureKeys(),
    required: false,
  });

  if (isCancel(selectedFeatures)) {
    cancel("Feature selection cancelled");
    process.exit(0);
  }

  // Step 4b: AI providers + capability packages — selecting any pulls
  // @warlock.js/ai automatically. The result still flows through the
  // `selectedAiProviders` → `aiProviders` pipeline, which now also carries the
  // capability packages (ai-tools / ai-panoptic / ai-workspace).
  const selectedAiProviders = await multiselect({
    message:
      "Add AI packages? Providers + capabilities — the core AI package is included automatically",
    options: [...getAiProviderOptions(), ...getAiPackageOptions()],
    required: false,
  });

  if (isCancel(selectedAiProviders)) {
    cancel("AI provider selection cancelled");
    process.exit(0);
  }

  // Step 5: Git initialization
  const useGit =
    (await confirm({
      message: "Initialize a Git repository?",
    })) === true;

  if (isCancel(useGit)) {
    cancel("Setup cancelled");
    process.exit(0);
  }

  // Step 6: JWT secret generation
  const useJWT =
    (await confirm({
      message: "Generate JWT secret keys?",
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
      aiProviders: selectedAiProviders as string[],
      useGit,
      useJWT,
    },
  };

  // Create the app
  await scaffold(appDetails);
}

/**
 * Run the scaffold and make the process's exit code tell the truth: anything
 * the user asked for that did not happen leaves the shell with a non-zero
 * status, so scripts and CI cannot mistake a half-built project for a finished
 * one. The problems themselves are printed by the scaffolder.
 */
async function scaffold(appDetails: Required<AppType>) {
  const outcome = await createWarlockApp(new App(appDetails));

  if (outcome && !outcome.ok) {
    process.exitCode = 1;
  }
}

/**
 * Resolve the full set of `AppOptions` from parsed CLI flags — applying the
 * non-interactive defaults, validating the database driver and feature/provider
 * keys, and handling the `none` (no database) selection.
 *
 * Pure and side-effect free (no prompts, no `process.exit`) so the flag → app
 * mapping is unit-testable. Throws on an unknown driver or feature key so the
 * caller can fail fast before any file is written.
 */
export function resolveNonInteractiveOptions(cli: CliFlags): AppOptions {
  const databaseDriver = cli.db ?? "mongodb";
  const noDatabase = isNoDatabase(databaseDriver);
  const driver = noDatabase ? undefined : getDatabaseDriver(databaseDriver);

  if (!noDatabase && !driver) {
    throw new Error(`Unknown database driver "${databaseDriver}"`);
  }

  const features = cli.features ?? [];
  const aiProviders = cli.ai ?? [];

  const allowedKeys = getAllFeatureKeys();
  const invalidKeys = [...features, ...aiProviders].filter(
    key => !allowedKeys.includes(key),
  );

  if (invalidKeys.length > 0) {
    throw new Error(`Unknown feature(s): ${invalidKeys.join(",")}`);
  }

  return {
    databaseDriver,
    databasePort: driver?.defaultPort ?? 27017,
    features,
    aiProviders,
    useGit: cli.git ?? false,
    useJWT: cli.jwt ?? false,
  };
}

/**
 * Non-interactive scaffold path for `--yes`. Builds the app from flags with
 * sensible defaults and skips every prompt — a single command scaffolds the
 * entire app. Validation lives in `resolveNonInteractiveOptions`; a typo fails
 * fast here instead of mid-install.
 */
async function createNonInteractive(cli: CliFlags) {
  const appName = (cli.name ?? "").trim();

  if (!appName) {
    // Reached either because --yes was passed with no name, or because stdin
    // has no TTY to prompt for one — either way, nothing is left to fall back
    // to. Name --yes AND every non-interactive flag so a CI log is enough to
    // fix the invocation without hunting for docs.
    cancel(
      "A project name is required and no terminal is available to ask for one. " +
        "Pass it as the first argument or --name=<name>. Non-interactive flags: " +
        "--yes, --pm=<npm|yarn|pnpm>, --db=<driver>|--no-db, --features=<list>, " +
        "--ai=<list>, --git|--no-git, --jwt|--no-jwt.",
    );
    process.exit(1);
  }

  const appPath = getAppPath(appName);

  if (!appPath) return;

  await detectPackageManagers();

  const packageManager = cli.pm ?? getPreferredPackageManager();

  if (!isValidPackageManager(packageManager)) {
    cancel(
      `Unknown package manager "${packageManager}" — expected one of: ${ALLOWED_PACKAGE_MANAGERS.join(", ")}`,
    );
    process.exit(1);
  }

  setPackageManager(packageManager);

  let options: AppOptions;

  try {
    options = resolveNonInteractiveOptions(cli);
  } catch (error) {
    cancel((error as Error).message);
    process.exit(1);
  }

  const appDetails: Required<AppType> = {
    appName,
    appType: "warlock",
    appPath,
    pkgManager: getPackageManager(),
    options,
  };

  await scaffold(appDetails);
}
