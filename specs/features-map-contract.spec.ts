import { describe, expect, it } from "vitest";

import {
  aiPackages,
  aiProviders,
  features,
  getAllFeatureKeys,
} from "../src/features/features-map";
import { databaseDrivers } from "../src/features/database-drivers";

/**
 * The scaffolder's features-map is the DISPLAY half of a cross-package contract:
 * every key here MUST exist in core's `allowedFeatures` (see the file header in
 * features-map.ts). We cannot import `@warlock.js/core` from inside this package
 * (isolation boundary), so these tests pin the LOCAL invariants that make the
 * subset relationship enforceable — well-formed, collision-free, lowercase keys.
 *
 * NOTE: the actual subset assertion (features-map keys ⊆ core.allowedFeatures)
 * belongs in a CI guard living in `@warlock.js/core`, where both sides are in
 * scope. This file guarantees the scaffolder side is clean so that guard only
 * ever has to check membership.
 */

const ALLOWED_GROUPS = new Set([
  "Auth & Access",
  "Rendering & Mail",
  "Media",
  "Storage & Cache",
  "Jobs & Messaging",
  "Realtime",
  "API Docs",
  "Tooling",
]);

describe("features array shape", () => {
  it("gives every feature a non-empty key, label, hint and a known group", () => {
    for (const feature of features) {
      expect(feature.key).toBeTruthy();
      expect(feature.label).toBeTruthy();
      expect(feature.hint).toBeTruthy();
      expect(ALLOWED_GROUPS.has(feature.group)).toBe(true);
    }
  });

  it("has no duplicate feature keys", () => {
    const keys = features.map((feature) => feature.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("marks at most the documented default (react) as defaultSelected", () => {
    const defaults = features
      .filter((feature) => feature.defaultSelected)
      .map((feature) => feature.key);

    expect(defaults).toEqual(["react"]);
  });
});

describe("aiProviders + aiPackages array shape", () => {
  const aiOptions = [...aiProviders, ...aiPackages];

  it("gives every provider/package a non-empty key, label and hint", () => {
    for (const option of aiOptions) {
      expect(option.key).toBeTruthy();
      expect(option.label).toBeTruthy();
      expect(option.hint).toBeTruthy();
    }
  });

  it("has no duplicate keys across providers and packages", () => {
    const keys = aiOptions.map((option) => option.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ai-prefixes every provider and package key", () => {
    for (const option of aiOptions) {
      expect(option.key.startsWith("ai-")).toBe(true);
    }
  });

  it("no longer exposes the old bare provider keys", () => {
    const allKeys = new Set(getAllFeatureKeys());
    const retired = ["openai", "google", "anthropic", "bedrock", "ollama"];

    for (const key of retired) {
      expect(allKeys.has(key)).toBe(false);
    }
  });

  it("offers the three AI capability satellite packages", () => {
    const packageKeys = aiPackages.map((pkg) => pkg.key);

    expect(packageKeys).toEqual(["ai-tools", "ai-panoptic", "ai-workspace"]);
  });
});

describe("cross-list contract invariants (scaffolder side)", () => {
  it("never lets a feature key collide with an AI provider/package key", () => {
    const featureKeys = new Set(features.map((feature) => feature.key));
    const collisions = [...aiProviders, ...aiPackages]
      .map((option) => option.key)
      .filter((key) => featureKeys.has(key));

    expect(collisions).toEqual([]);
  });

  it("never lists a database driver value or the umbrella `ai` key as a feature", () => {
    const featureKeys = new Set(features.map((feature) => feature.key));

    for (const driver of databaseDrivers) {
      expect(featureKeys.has(driver.value)).toBe(false);
    }

    // `ai` is pulled transitively by selecting a provider; it is never a pick.
    expect(featureKeys.has("ai")).toBe(false);
    expect(getAllFeatureKeys()).not.toContain("ai");
  });

  it("keeps every key a lowercase token core's add map can match", () => {
    // core's `allowedFeatures` keys are simple kebab/lowercase identifiers; a key
    // with spaces or uppercase here would never line up with that map.
    for (const key of getAllFeatureKeys()) {
      expect(key).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("exposes the union of feature + provider + package keys with no duplicates", () => {
    const all = getAllFeatureKeys();
    const expected = [
      ...features.map((feature) => feature.key),
      ...aiProviders.map((provider) => provider.key),
      ...aiPackages.map((pkg) => pkg.key),
    ];

    expect(all).toEqual(expected);
    expect(new Set(all).size).toBe(all.length);
  });
});
