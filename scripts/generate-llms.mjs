#!/usr/bin/env node
/**
 * Generate `llms.txt` + `llms-full.txt` at this package's root.
 *
 * Self-contained, package-agnostic projector. Derives the package name and
 * tagline from the sibling `package.json`, then reads every
 * `skills/<skill>/SKILL.md` to produce two artifacts:
 *
 * - `llms.txt`      — header + a one-line index of every skill (its
 *                     `description` frontmatter). The llmstxt.org-style entry
 *                     point an LLM ingests to know what the package offers.
 * - `llms-full.txt` — header + the full body of every SKILL.md plus any sibling
 *                     reference markdown inside each skill folder. The single
 *                     file an LLM can ingest end-to-end.
 *
 * Both files are *projections* of `skills/`, never hand-edited. Re-run after any
 * skill change so the index cannot drift from the skills it points at.
 *
 * Usage: node scripts/generate-llms.mjs   (run from the package root)
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(scriptDir, "..");
const skillsDir = join(pkgRoot, "skills");
const llmsTxtPath = join(pkgRoot, "llms.txt");
const llmsFullPath = join(pkgRoot, "llms-full.txt");

const pkgJson = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));
const packageName = pkgJson.name;
const tagline = pkgJson.description ?? "";

// "@warlock.js/ai-anthropic" -> "Warlock AI Anthropic"
const shortName = packageName.split("/").pop();
const projectName =
  "Warlock " +
  shortName
    .split("-")
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");

/**
 * Parse simple `key: value` YAML frontmatter (the only form SKILL.md uses —
 * no nested objects, no arrays). Strips surrounding quotes from the value.
 */
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { meta: {}, body: text };
  }

  const meta = {};

  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");

    if (colon === -1) {
      continue;
    }

    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();

    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1).replace(/''/g, "'").replace(/\\"/g, '"');
    }

    meta[key] = value;
  }

  return { meta, body: match[2] };
}

/**
 * Collect every `skills/<folder>/SKILL.md`. Returns entries sorted by folder
 * name for deterministic output. Files at the skills root (README.md) are
 * ignored — only direct subdirectories holding a SKILL.md count.
 */
function collectSkills() {
  if (!existsSync(skillsDir)) {
    return [];
  }

  const skills = [];

  for (const entry of readdirSync(skillsDir).sort()) {
    const folderPath = join(skillsDir, entry);

    if (!statSync(folderPath).isDirectory()) {
      continue;
    }

    const skillPath = join(folderPath, "SKILL.md");

    if (!existsSync(skillPath)) {
      continue;
    }

    skills.push({ folder: entry, path: skillPath, folderPath });
  }

  return skills;
}

/**
 * List sibling reference markdown inside a skill folder (everything except
 * SKILL.md and non-`.md` files), sorted.
 */
function collectReferenceFiles(folderPath) {
  const refs = [];

  for (const entry of readdirSync(folderPath).sort()) {
    if (entry === "SKILL.md" || !entry.endsWith(".md")) {
      continue;
    }

    refs.push({ name: entry, path: join(folderPath, entry) });
  }

  return refs;
}

const skills = collectSkills();

// --- llms.txt (index) ---
const indexLines = [`# ${projectName}`, ``, `> Package: \`${packageName}\``, ``];

if (tagline) {
  indexLines.push(`> ${tagline}`, ``);
}

indexLines.push(`## Skills`, ``);

for (const skill of skills) {
  const { meta } = parseFrontmatter(readFileSync(skill.path, "utf8"));
  const description = meta.description ?? "(no description)";

  indexLines.push(`- [${skill.folder}](${packageName}/${skill.folder}/SKILL.md): ${description}`);
}

writeFileSync(llmsTxtPath, indexLines.join("\n") + "\n", "utf8");

// --- llms-full.txt (concatenated bodies) ---
const fullLines = [
  `# ${projectName} — full skills`,
  ``,
  `> Package: \`${packageName}\``,
  ``,
  `> Generated artifact. Concatenates every SKILL.md and reference file under \`${packageName}/skills/\`. Re-run \`node scripts/generate-llms.mjs\` after any change.`,
  ``,
];

for (const skill of skills) {
  fullLines.push(`## ${skill.folder}  \`${packageName}/${skill.folder}/SKILL.md\``, ``, readFileSync(skill.path, "utf8"), ``);

  for (const ref of collectReferenceFiles(skill.folderPath)) {
    fullLines.push(
      `### ${skill.folder}/${ref.name}  \`${packageName}/${skill.folder}/${ref.name}\``,
      ``,
      readFileSync(ref.path, "utf8"),
      ``,
    );
  }
}

writeFileSync(llmsFullPath, fullLines.join("\n") + "\n", "utf8");

console.log(`OK  ${packageName}  (${skills.length} skills)`);
console.log(`    ${llmsTxtPath}`);
console.log(`    ${llmsFullPath}`);
