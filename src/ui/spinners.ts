/**
 * Themed spinner messages for the wizard
 */
export const spinnerMessages = {
  installingDeps: "📦 Summoning dependencies...",
  depsInstalled: "📦 Dependencies materialized! ✅",

  initializingGit: "📂 Initializing grimoire (git)...",
  gitInitialized: "📂 Grimoire initialized! ✅",

  generatingJwt: "🔐 Forging secret keys...",
  jwtGenerated: "🔐 Secret keys forged! ✅",

  warmingCache: "⚡ Charging magical circuits...",
  cacheWarmed: "⚡ Circuits charged! ✅",

  configuringFeatures: "🔧 Configuring enchantments...",
  featuresConfigured: "🔧 Enchantments applied! ✅",

  copyingTemplate: "📋 Preparing your spellbook...",
  templateCopied: "📋 Spellbook ready! ✅",
} as const;
