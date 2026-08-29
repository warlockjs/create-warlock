#!/usr/bin/env node
/**
 * Prevent test/build-only resolver aliases from coupling a publishable package
 * to a sibling checkout. Each package.json is treated as a publish boundary.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IGNORED_DIRECTORIES = new Set([".git", "coverage", "dist", "node_modules"]);
const CONFIG_FILE = /^(?:vite|vitest)\.config\.[cm]?[jt]sx?$/;

function stripJsonComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/,\s*([}\]])/g, "$1");
}

function isInside(root, candidate) {
  const resolvedRoot = realPath(root);
  const resolvedCandidate = realPath(candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);

  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function realPath(candidate) {
  return existsSync(candidate) ? realpathSync(candidate) : path.resolve(candidate);
}

function packageRoots(root) {
  const roots = [];
  const walk = directory => {
    if (existsSync(path.join(directory, "package.json"))) roots.push(directory);

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name)) {
        walk(path.join(directory, entry.name));
      }
    }
  };

  walk(path.resolve(root));
  return roots;
}

function filesInPackage(packageRoot, predicate) {
  const files = [];
  const walk = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (
          !IGNORED_DIRECTORIES.has(entry.name) &&
          !existsSync(path.join(directory, entry.name, "package.json"))
        ) {
          walk(path.join(directory, entry.name));
        }
      } else if (predicate(entry.name)) {
        files.push(path.join(directory, entry.name));
      }
    }
  };

  walk(packageRoot);
  return files;
}

function aliasTargets(source, configFile) {
  const targets = [];
  const objectAliases = /\balias\s*:\s*{([\s\S]*?)}/g;
  const arrayAliases = /\balias\s*:\s*\[([\s\S]*?)\]/g;
  const literal = /(?:["'][^"']+["']|[\w$]+)\s*:\s*["']([^"']+)["']/g;
  const replacement = /\breplacement\s*:\s*["']([^"']+)["']/g;
  const dirnameExpression = /(?:path\.)?(?:resolve|join)\(\s*__dirname\s*,\s*(["'])(.*?)\1\s*\)/g;

  for (const match of source.matchAll(objectAliases)) {
    for (const value of match[1].matchAll(literal)) targets.push(value[1]);
    for (const value of match[1].matchAll(dirnameExpression)) targets.push(value[2]);
  }
  for (const match of source.matchAll(arrayAliases)) {
    for (const value of match[1].matchAll(replacement)) targets.push(value[1]);
    for (const value of match[1].matchAll(dirnameExpression)) targets.push(value[2]);
  }

  return targets
    .filter(target => target.startsWith(".") || path.isAbsolute(target))
    .map(target => path.resolve(path.dirname(configFile), target));
}

function addViolation(violations, packageRoot, configFile, target, kind) {
  if (!isInside(packageRoot, target)) {
    violations.push({
      packageRoot,
      configFile,
      target,
      kind,
    });
  }
}

/** Return every resolver target that crosses a package publish boundary. */
export function findResolverBoundaryViolations(root) {
  const violations = [];

  for (const packageRoot of packageRoots(root)) {
    for (const configFile of filesInPackage(packageRoot, name => name === "tsconfig.json")) {
      const config = JSON.parse(stripJsonComments(readFileSync(configFile, "utf8")));
      const compilerOptions = config.compilerOptions ?? {};
      const baseUrl = path.resolve(path.dirname(configFile), compilerOptions.baseUrl ?? ".");

      for (const replacements of Object.values(compilerOptions.paths ?? {})) {
        for (const replacement of replacements) {
          addViolation(
            violations,
            packageRoot,
            configFile,
            path.resolve(baseUrl, replacement.replace(/\*.*$/, "")),
            "tsconfig paths",
          );
        }
      }
    }

    for (const configFile of filesInPackage(packageRoot, name => CONFIG_FILE.test(name))) {
      const source = readFileSync(configFile, "utf8");
      for (const target of aliasTargets(source, configFile)) {
        addViolation(violations, packageRoot, configFile, target, "Vite/Vitest alias");
      }
    }
  }

  return violations;
}

function main() {
  const root = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const violations = findResolverBoundaryViolations(root);

  if (violations.length === 0) return;

  for (const violation of violations) {
    console.error(
      `[resolver-boundary] ${path.relative(root, violation.configFile)}: ${violation.kind} resolves outside ${violation.packageRoot}: ${violation.target}`,
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
