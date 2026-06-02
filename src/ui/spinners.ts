/**
 * Themed spinner messages for the wizard
 */
export const spinnerMessages = {
  installingDeps: "Summoning dependencies...",
  depsInstalled: "Dependencies materialized!",

  initializingGit: "Initializing grimoire (git)...",
  gitInitialized: "Grimoire initialized!",

  generatingJwt: "Forging secret keys...",
  jwtGenerated: "Secret keys forged!",

  warmingCache: "Charging magical circuits...",
  cacheWarmed: "Circuits charged!",

  addingFeatures: "Weaving in your features...",
  featuresAdded: "Features woven in!",
  featuresFailed:
    "Some features could not be added  add them later with`warlock add`",

  copyingTemplate: "Preparing your spellbook...",
  templateCopied: "Spellbook ready!",
} as const;
