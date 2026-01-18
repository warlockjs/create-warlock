import { exec, execSync } from "child_process";
import { promisify } from "util";
import detectPackageManager from "which-pm-runs";

const execAsync = promisify(exec);

let detectedPackageManager: string | undefined;
let cachedSystemManagers: string[] | undefined;
let cachedPreferredManager: string | undefined;

export function getPackageManager() {
  if (detectedPackageManager) {
    return detectedPackageManager;
  }

  return getPreferredPackageManager();
}

/**
 * Check if a package manager is installed
 */
function isInstalled(manager: string): boolean {
  try {
    execSync(`${manager} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a package manager is installed (async)
 */
async function checkManager(manager: string): Promise<boolean> {
  try {
    await execAsync(`${manager} --version`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect available package managers asynchronously and cache results
 */
export async function detectPackageManagers() {
  const managers = ["npm"];
  const checks = [checkManager("yarn"), checkManager("pnpm")];

  const [hasYarn, hasPnpm] = await Promise.all(checks);

  if (hasYarn) managers.push("yarn");
  if (hasPnpm) managers.push("pnpm");

  cachedSystemManagers = managers;

  // Determine preference
  const runningPm = detectPackageManager()?.name;
  if (runningPm && runningPm !== "npm") {
    cachedPreferredManager = runningPm;
  } else if (hasYarn) {
    cachedPreferredManager = "yarn";
  } else if (hasPnpm) {
    cachedPreferredManager = "pnpm";
  } else {
    cachedPreferredManager = "npm";
  }
}

/**
 * Get available package managers on the system
 */
export function getSystemPackageManagers(): string[] {
  if (cachedSystemManagers) return cachedSystemManagers;

  const managers = ["npm"]; // npm is assumed to be always available

  if (isInstalled("yarn")) {
    managers.push("yarn");
  }

  if (isInstalled("pnpm")) {
    managers.push("pnpm");
  }

  return managers;
}

/**
 * Get the preferred package manager based on priority
 */
export function getPreferredPackageManager(): string {
  if (cachedPreferredManager) return cachedPreferredManager;

  // Priority 1: The manager currently running the script
  const runningPm = detectPackageManager()?.name;
  if (runningPm && runningPm !== "npm") return runningPm;

  // Priority 2: Yarn (if installed)
  if (isInstalled("yarn")) return "yarn";

  // Priority 3: pnpm (if installed)
  if (isInstalled("pnpm")) return "pnpm";

  // Priority 4: npm (default)
  return "npm";
}

export function setPackageManager(packageManager: string) {
  detectedPackageManager = packageManager;
}

export function installCommand() {
  return `${getPackageManager()} install`;
}

export function startCommand() {
  if (getPackageManager() === "npm") return "npm run dev";

  return `${getPackageManager()} dev`;
}

export function runPackageManagerCommand(command: string) {
  const packageManager = getPackageManager();

  if (packageManager === "npm") return `npm run ${command}`;

  return `${packageManager} ${command}`;
}
