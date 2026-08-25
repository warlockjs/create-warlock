import { colors } from "@mongez/copper";
import type { CommandResult } from "../helpers/exec";
import { tail } from "../helpers/exec";

/**
 * Failure reporting for the scaffolder.
 *
 * The house rule this module enforces: a step that did not succeed is never
 * described as if it did, and a failure always carries three things — WHAT ran,
 * HOW it ended (exit code), and ENOUGH of its output to act on. "Something went
 * wrong, add it later" is not a report.
 */

/** A step that did not do what the user asked for. */
export type Problem = {
  /** The step, e.g. `Dependency install`. */
  step: string;
  /** One-line summary of what is now missing / broken. */
  detail: string;
  /** The command behind the failure, when there was one. */
  result?: CommandResult;
  /** Extra guidance: how to retry, what to check. */
  hints?: string[];
};

const bullet = colors.red("✖");

/**
 * The command line, its exit status, and the tail of what it printed.
 */
function describeCommand(result: CommandResult): string[] {
  const lines: string[] = [];

  lines.push(`${colors.dim("command:")} ${colors.white(result.command)}`);

  if (result.cwd) {
    lines.push(`${colors.dim("in:")}      ${colors.white(result.cwd)}`);
  }

  if (result.error) {
    lines.push(
      `${colors.dim("failed:")}  ${colors.white(result.error.message || String(result.error))}`,
    );
  } else if (result.signal) {
    lines.push(`${colors.dim("killed:")}  ${colors.white(result.signal)}`);
  } else {
    lines.push(
      `${colors.dim("exited:")}  ${colors.white(`code ${result.code}`)}`,
    );
  }

  const output = tail(result.stderr) || tail(result.stdout);

  if (output) {
    lines.push(colors.dim("output:"));

    for (const line of output.split("\n")) {
      lines.push(`  ${colors.dim(line)}`);
    }
  }

  return lines;
}

function printProblem(problem: Problem) {
  console.log(`  ${bullet} ${colors.bold(colors.red(problem.step))}`);
  console.log(`     ${colors.white(problem.detail)}`);

  if (problem.result) {
    for (const line of describeCommand(problem.result)) {
      console.log(`     ${line}`);
    }
  }

  for (const hint of problem.hints ?? []) {
    console.log(`     ${colors.yellow("→")} ${colors.yellow(hint)}`);
  }

  console.log();
}

/**
 * Report a failure the scaffold cannot continue past, and leave the process
 * with a non-zero exit code. Nothing after this point may print a success.
 */
export function failFatally(problem: Problem): never {
  console.log();
  console.log(colors.bold(colors.red("  SCAFFOLD FAILED")));
  console.log();

  printProblem(problem);

  console.log(
    colors.dim(
      "  The project directory was left in place so you can inspect it.",
    ),
  );
  console.log();

  process.exit(1);
}

/**
 * Report the steps that failed on a scaffold that otherwise completed, and say
 * plainly what the project does NOT have as a result.
 */
export function showProblems(problems: Problem[]) {
  if (problems.length === 0) return;

  console.log();
  console.log(
    colors.bold(
      colors.yellow(
        `  COMPLETED WITH ${problems.length} PROBLEM${problems.length === 1 ? "" : "S"}`,
      ),
    ),
  );
  console.log();

  for (const problem of problems) {
    printProblem(problem);
  }
}

/** Neutral, non-failing information — e.g. which versions got pinned and why. */
export function showNotes(notes: string[]) {
  for (const note of notes) {
    console.log(`  ${colors.yellow("!")} ${colors.dim(note)}`);
  }

  if (notes.length > 0) console.log();
}

/**
 * A scaffold that finished with problems still produced a project, so print the
 * same facts the success screen would — minus the celebration, and listing only
 * what is actually installed.
 */
export function showPartialScreen(options: {
  projectName: string;
  database: string;
  features: string[];
  missingFeatures: string[];
  packageManager: string;
}): void {
  const { projectName, database, features, missingFeatures, packageManager } =
    options;

  const devCommand =
    packageManager === "npm" ? "npm run dev" : `${packageManager} dev`;

  console.log(
    `  ${colors.bold(colors.yellow("⚠ PROJECT CREATED — BUT NOT AS REQUESTED"))}`,
  );
  console.log();
  console.log(`     ${colors.dim("Project:  ")}${colors.white(projectName)}`);
  console.log(`     ${colors.dim("Database: ")}${colors.white(database)}`);
  console.log(
    `     ${colors.dim("Installed:")}${colors.white(features.length > 0 ? " " + features.join(", ") : " none")}`,
  );

  if (missingFeatures.length > 0) {
    console.log(
      `     ${colors.dim("Missing:  ")}${colors.red(missingFeatures.join(", "))}`,
    );
  }

  console.log();
  console.log(`  ${colors.dim("Fix the problems above, then:")}`);
  console.log();
  console.log(`     ${colors.cyan("cd")} ${projectName}`);

  if (missingFeatures.length > 0) {
    console.log(
      `     ${colors.cyan(`npx warlock add ${missingFeatures.join(" ")}`)}`,
    );
  }

  console.log(`     ${colors.cyan(devCommand)}`);
  console.log();
}

/**
 * Turn an npm/yarn/pnpm failure into actionable guidance where we can
 * recognise it. `ETARGET` in particular is the signature of a dependency
 * pinned to a version that was never published — the bug this whole reporting
 * path was written for.
 */
export function installFailureHints(result: CommandResult | undefined) {
  const hints = [
    "Nothing was installed. Fix the error above, then run the install again inside the project.",
  ];

  const output = `${result?.stdout ?? ""}${result?.stderr ?? ""}`;

  if (/ETARGET|No matching version found/i.test(output)) {
    hints.push(
      "A dependency is pinned to a version that does not exist on the registry — check the @warlock.js/* versions in package.json.",
    );
  }

  if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|network/i.test(output)) {
    hints.push("The registry was unreachable — check your network or proxy.");
  }

  if (/EACCES|EPERM/i.test(output)) {
    hints.push(
      "Permission denied — check the directory's ownership before retrying.",
    );
  }

  return hints;
}
