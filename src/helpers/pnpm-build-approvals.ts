/** Native dependency build scripts required by features the scaffold explicitly selected. */
const FEATURE_BUILD_APPROVALS: Readonly<Record<string, readonly string[]>> = {
  image: ["sharp"],
};

export function requiredPnpmBuildApprovals(
  features: readonly string[],
): readonly string[] {
  return [
    ...new Set(
      features.flatMap(feature => FEATURE_BUILD_APPROVALS[feature] ?? []),
    ),
  ];
}

/**
 * Add only known feature-required builds to pnpm 11's workspace policy.
 * Existing `false` values are user decisions and are never overridden.
 */
export function mergePnpmBuildApprovals(
  yaml: string,
  packages: readonly string[],
): string {
  let result = yaml;
  for (const packageName of packages) {
    result = mergeOneApproval(result, packageName);
  }
  return result;
}

const quotedKey = (name: string) => `(?:${name}|"${name}"|'${name}')`;

/** Edit one ordinary YAML mapping while preserving every untouched byte. */
function mergeOneApproval(yaml: string, packageName: string): string {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = /^allowBuilds:\s*(?:#.*)?(?:\r?\n|$)/m.exec(yaml);

  if (!block) {
    // Flow mappings are deliberately not rewritten. A hand parser must never
    // turn a decided flow entry into a duplicate block key.
    if (/^(?:allowBuilds|"allowBuilds"|'allowBuilds')\s*:/m.test(yaml))
      return yaml;
    return `${yaml.replace(/\s*$/, "")}\nallowBuilds:\n  ${packageName}: true\n`;
  }

  const start = block.index + block[0].length;
  const tail = yaml.slice(start);
  const nextTopLevel = /^(?!\s|#|$)[^\r\n]+/m.exec(tail);
  const end = nextTopLevel ? start + nextTopLevel.index : yaml.length;
  const mapping = yaml.slice(start, end);
  const key = quotedKey(escaped);
  const entry = new RegExp(
    `^(\\s*)${key}\\s*:\\s*([^#\\r\\n]*)(.*)$`,
    "m",
  ).exec(mapping);

  if (entry) {
    const value = entry[2]!.trim();
    if (value === "true" || value === "false") return yaml;
    if (
      !/^(?:set this to true or false|"set this to true or false"|'set this to true or false')$/.test(
        value,
      )
    )
      return yaml;
    // pnpm's undecided placeholder belongs to this generated mapping: decide it
    // in place rather than emitting a duplicate YAML key.
    const comment = entry[3] ?? "";
    const replacement = `${entry[1]}${packageName}: true${comment.startsWith("#") ? " " : ""}${comment}`;
    return `${yaml.slice(0, start)}${mapping.slice(0, entry.index)}${replacement}${mapping.slice(entry.index + entry[0].length)}${yaml.slice(end)}`;
  }

  const indentation = /^([ \t]+)\S/m.exec(mapping)?.[1] ?? "  ";
  return `${yaml.slice(0, start)}${indentation}${packageName}: true\n${mapping}${yaml.slice(end)}`;
}
