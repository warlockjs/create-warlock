/**
 * Themed spinner messages for the wizard.
 *
 * Every step has BOTH a success and a failure message, and the orchestrator
 * picks between them from the step's actual result. A spinner that can only
 * stop with a cheerful message is a spinner that lies.
 */
export const spinnerMessages = {
  installingDeps: "Summoning dependencies...",
  depsInstalled: "Dependencies materialized!",
  depsFailed: "Dependencies could not be installed",

  initializingGit: "Initializing grimoire (git)...",
  gitInitialized: "Grimoire initialized!",
  gitFailed: "Git repository was not initialized",

  generatingJwt: "Forging secret keys...",
  jwtGenerated: "Secret keys forged!",
  jwtFailed: "Secret keys were NOT generated",

  warmingCache: "Charging magical circuits...",
  cacheWarmed: "Circuits charged!",
  cacheWarmFailed:
    "Cache could not be warmed (harmless — it builds on first run)",

  addingFeatures: "Weaving in your features...",
  featuresAdded: "Features woven in!",
  featuresPartial: "Some features were not added",
  featuresFailed: "No features could be added",

  copyingTemplate: "Preparing your spellbook...",
  templateCopied: "Spellbook ready!",
  templateFailed: "The project template could not be copied",
} as const;
