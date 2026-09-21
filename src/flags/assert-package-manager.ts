import { cancel } from "@clack/prompts";
import {
  ALLOWED_PACKAGE_MANAGERS,
  getSystemPackageManagers,
  isValidPackageManager,
} from "../helpers/package-manager";

/**
 * Is `--pm` spelled like a package manager we support? Availability validation
 * calls this first, so an unknown executable is rejected before installation.
 */
export function assertPackageManagerAllowed(
  requested: string | undefined,
): void {
  if (!requested) return;

  if (!isValidPackageManager(requested)) {
    cancel(
      `Unknown package manager "${requested}" — expected one of: ${ALLOWED_PACKAGE_MANAGERS.join(", ")}`,
    );
    process.exit(1);
  }
}

/**
 * Is `--pm` spelled right AND actually on this machine? Every CLI path uses
 * this stronger check before it selects a manager or begins scaffolding. The
 * scaffold always installs dependencies; accepting a known-unavailable
 * executable would leave a known partial project behind.
 *
 * `bun` is the case that makes this concrete. It is in
 * {@link ALLOWED_PACKAGE_MANAGERS}, so the spelling check passes.
 *
 * MUST be called after package-manager detection has completed, since
 * detection is what {@link getSystemPackageManagers} reports.
 */
export function assertPackageManagerAvailable(
  requested: string | undefined,
): void {
  if (requested === undefined) return;

  if (!requested.trim()) {
    cancel(
      "The --pm flag requires a package manager value (npm, yarn, pnpm, or bun).",
    );
    process.exit(1);
  }

  assertPackageManagerAllowed(requested);

  const available = getSystemPackageManagers();

  if (!available.includes(requested)) {
    cancel(
      `Package manager "${requested}" was not found on this machine — detected: ${available.join(", ")}. Install it, or pass one of those to --pm.`,
    );
    process.exit(1);
  }
}
