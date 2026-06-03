/**
 * Presentation manifest for the scaffolder's feature prompts.
 *
 * This file is **display metadata only** — keys, labels, hints, grouping, and
 * default selections. It deliberately holds NO dependency names or versions:
 * the single source of truth for what each feature installs is the `add`
 * command's feature map in `@warlock.js/core`
 * (`src/generations/add-command.action.ts`). The scaffolder collects the
 * selections here and delegates the actual install to `warlock add`, so the
 * two never drift on versions again.
 *
 * Every `key` below MUST exist in core's `allowedFeatures`; a CI guard should
 * assert that subset relationship so a typo fails the build instead of shipping.
 */

export type FeatureGroup =
  | "Rendering & Mail"
  | "Media"
  | "Storage & Cache"
  | "Jobs & Messaging"
  | "Realtime"
  | "API Docs"
  | "Tooling";

export type FeatureOption = {
  /** Must match a key in core's `add` feature map. */
  key: string;
  label: string;
  hint: string;
  group: FeatureGroup;
  defaultSelected?: boolean;
};

/**
 * Optional features offered in the general multiselect step. The database
 * driver (its own select) and AI providers (their own step) are intentionally
 * NOT here — they have dedicated prompts.
 */
export const features: FeatureOption[] = [
  // Rendering & Mail
  {
    key: "react",
    label: "React (rendering & mails)",
    hint: "React + ReactDOM for non-interactive rendering and HTML/email generation",
    group: "Rendering & Mail",
    defaultSelected: true,
  },
  {
    key: "react-email",
    label: "React Email",
    hint: "Build email templates with React + Tailwind (pulls react + mail)",
    group: "Rendering & Mail",
  },
  {
    key: "mail",
    label: "Mail (Nodemailer)",
    hint: "Send emails via SMTP",
    group: "Rendering & Mail",
  },
  {
    key: "ses",
    label: "Amazon SES",
    hint: "Send emails via the AWS SES API",
    group: "Rendering & Mail",
  },

  // Media
  {
    key: "image",
    label: "Image processing (Sharp)",
    hint: "Resize, convert, and optimize images",
    group: "Media",
  },

  // Storage & Cache
  {
    key: "s3",
    label: "S3 storage",
    hint: "AWS S3 for cloud file storage",
    group: "Storage & Cache",
  },
  {
    key: "redis",
    label: "Redis cache",
    hint: "Redis driver for the cache layer",
    group: "Storage & Cache",
  },

  // Jobs & Messaging
  {
    key: "scheduler",
    label: "Scheduler",
    hint: "Background tasks and cron jobs",
    group: "Jobs & Messaging",
  },
  {
    key: "herald",
    label: "Herald (RabbitMQ)",
    hint: "Message broker for event-driven architecture",
    group: "Jobs & Messaging",
  },

  // Realtime
  {
    key: "socket",
    label: "Socket.IO",
    hint: "Realtime websocket server",
    group: "Realtime",
  },

  // API Docs (swagger / postman / openapi) — not shipped yet; they will arrive
  // together in the unified @warlock.js/api-docs package. Re-add the selection
  // once that package exists. (Removed so the wizard can't offer unbuilt features.)

  // Tooling
  {
    key: "test",
    label: "Testing (Vitest)",
    hint: "Vitest + coverage + per-worker DB/cache test setup",
    group: "Tooling",
  },
];

export type AiProviderOption = {
  /** Must match a provider key in core's `add` feature map. */
  key: string;
  label: string;
  hint: string;
};

/**
 * AI providers offered in the dedicated AI step. Selecting any of these pulls
 * the core `@warlock.js/ai` package automatically via the provider's `requires`
 * in core's feature map — the scaffolder never lists `ai` as a standalone pick.
 */
export const aiProviders: AiProviderOption[] = [
  { key: "openai", label: "OpenAI", hint: "GPT models via the OpenAI API" },
  { key: "google", label: "Google (Gemini)", hint: "Gemini models via Google AI" },
  { key: "anthropic", label: "Anthropic (Claude)", hint: "Claude models via the Anthropic API" },
  { key: "bedrock", label: "AWS Bedrock", hint: "Foundation models via Amazon Bedrock" },
  { key: "ollama", label: "Ollama", hint: "Local models via Ollama" },
];

/**
 * Feature options for the multiselect prompt, ordered by group with the group
 * surfaced in the hint (keeps a flat list scannable without group widgets).
 */
export function getFeatureOptions() {
  return features.map(feature => ({
    value: feature.key,
    label: feature.label,
    hint: `${feature.group} — ${feature.hint}`,
  }));
}

/**
 * Keys pre-checked in the feature multiselect.
 */
export function getDefaultFeatureKeys(): string[] {
  return features.filter(feature => feature.defaultSelected).map(feature => feature.key);
}

/**
 * AI provider options for the dedicated AI multiselect step.
 */
export function getAiProviderOptions() {
  return aiProviders.map(provider => ({
    value: provider.key,
    label: provider.label,
    hint: provider.hint,
  }));
}

/**
 * Every selectable key the scaffolder knows about (features + AI providers).
 * Used to validate `--features` / `--ai` flags in non-interactive mode.
 */
export function getAllFeatureKeys(): string[] {
  return [...features.map(feature => feature.key), ...aiProviders.map(provider => provider.key)];
}
