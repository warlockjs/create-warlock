import type { CliFlags } from "../commands/create-new-app/types";
import { getDefaultFeatureKeys } from "../features/features-map";
import { getPreferredPackageManager } from "../helpers/package-manager";

/**
 * The wizard's prompts, pre-selected from whatever the user already spelled
 * out on the command line.
 *
 * Before this existed, `--customize --db=postgres` silently threw the driver
 * away: the wizard asked its own question with its own default and the flag
 * never reached anything. A flag that is accepted and then ignored is the
 * worst of both worlds — the run succeeds, and the answer is wrong.
 *
 * So a flag passed alongside `--customize` is not a contradiction to refuse,
 * it is an answer given early: the prompt opens on that value and the user
 * can still change it.
 */
export type WizardSeeds = {
  packageManager: string;
  databaseDriver: string | undefined;
  features: string[];
  aiProviders: string[];
  useGit: boolean;
  useJWT: boolean;
};

export function seedFromFlags(cli: CliFlags): WizardSeeds {
  return {
    packageManager: cli.pm ?? getPreferredPackageManager(),
    databaseDriver: cli.db,
    features: cli.features ?? defaultFeatures(cli),
    aiProviders: cli.ai ?? [],
    // clack's confirm opens on `true` when nothing is passed, which is the
    // behaviour these two prompts already had.
    useGit: cli.git ?? true,
    useJWT: cli.jwt ?? true,
  };
}

/**
 * `--stack=web` is the one structural answer, and the wizard has no stack
 * question of its own — it asks for features instead. So the stack arrives as
 * a pre-ticked `web` feature rather than being dropped on the floor.
 */
function defaultFeatures(cli: CliFlags): string[] {
  const defaults = getDefaultFeatureKeys();

  if (cli.stack !== "web") return defaults;

  return [...new Set([...defaults, "web"])];
}
