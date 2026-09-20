import { cancel } from "@clack/prompts";
import {
  ALLOWED_PACKAGE_MANAGERS,
  getSystemPackageManagers,
  isValidPackageManager,
} from "../helpers/package-manager";

/**
 * Is `--pm` SPELLED like a package manager we support? The check every path
 * runs, and the only one the non-interactive paths run: passing `--pm=bun` on
 * a machine without bun is the caller's problem to hit at install time, and
 * tightening that is a separate decision.
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
 * Is `--pm` spelled right AND actually on this machine? The wizard needs the
 * stronger question, because its prompt is built from
 * {@link getSystemPackageManagers}: a value that is allowed but undetected
 * never appears among the options, so the flag is accepted and then silently
 * dropped — worse than being refused.
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
  if (!requested) return;

  assertPackageManagerAllowed(requested);

  const available = getSystemPackageManagers();

  if (!available.includes(requested)) {
    cancel(
      `Package manager "${requested}" was not found on this machine — detected: ${available.join(", ")}. Install it, or pass one of those to --pm.`,
    );
    process.exit(1);
  }
}
