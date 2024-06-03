import detectPackageManager from "which-pm-runs";

let detectedPackageManager: string | undefined;

export function getPackageManager() {
  if (detectedPackageManager) {
    return detectedPackageManager;
  }

  const packageManager = detectPackageManager();

  return packageManager.name || "npm";
}

export function setPackageManager(packageManager: string) {
  detectedPackageManager = packageManager;
}

export function installCommand() {
  return `${getPackageManager()} install`;
}

export function startCommand() {
  if (getPackageManager() === "npm") return "npm run start";

  return `${getPackageManager()} start`;
}

export function runPackageManagerCommand(command: string) {
  const packageManager = getPackageManager();

  if (packageManager === "npm") return `npm run ${command}`;

  return `${packageManager} ${command}`;
}
