import { outro } from "@clack/prompts";
import { colors } from "@mongez/copper";
import {
  copyDirectory,
  getFile,
  getJsonFile,
  putFile,
  putJsonFile,
  renameFile,
} from "@warlock.js/fs";
import path from "path";
import { executeCommand } from "./exec";
import { startCommand } from "./package-manager";
import { Template, template } from "./paths";

/**
 * Bootstrap the project's git repository.
 *
 * Returns `false` as soon as a step fails, and leaves that step's captured
 * output where the caller can claim it with `takeLastCommandOutput()`. It used
 * to `return true` unconditionally, which meant a machine without git printed
 * "Grimoire initialized!" over a directory that was not a repository.
 */
export async function initializeGitRepository(appPath: string) {
  const steps: string[][] = [
    // initialize git repository
    ["init"],
    // switching to `main` branch
    ["checkout", "-b", "main"],
    // add files
    ["add", "."],
    // commit files
    ["commit", "-m", "Initial commit"],
  ];

  for (const args of steps) {
    const succeeded = await executeCommand(`git`, args, appPath);

    if (!succeeded) return false;
  }

  return true;
}

export async function updateEnvFile(appPath: string, appName: string) {
  // update package.json file
  const packageJson: any = getJsonFile(path.resolve(appPath, "package.json"));

  packageJson.name = appName;

  putJsonFile(path.resolve(appPath, "package.json"), packageJson);

  // update env file
  const dotEnv = getFile(path.resolve(appPath, ".env"))
    .replace("AppName", appName)
    .replace(
      "AppCodeName",
      appName
        .split(/-|_/g)
        .map(word => word[0])
        .join(""),
    );

  putFile(path.resolve(appPath, ".env"), dotEnv);

  // update .env.production file
  let dotEnvProduction = getFile(path.resolve(appPath, ".env.shared"));

  dotEnvProduction = dotEnvProduction.replace("AppName", appName).replace(
    "AppCodeName",
    appName
      .split(/-|_/g)
      .map(word => word[0])
      .join(""),
  );

  putFile(path.resolve(appPath, ".env.shared"), dotEnvProduction);
}

export async function copyTemplateFiles(
  templateName: Template,
  appPath: string,
  _appName: string,
) {
  // copy project files
  copyDirectory(template(templateName), appPath);

  // replace _.gitignore to
  renameFile(
    path.resolve(appPath, "_.gitignore"),
    path.resolve(appPath, ".gitignore"),
  );
}

export async function allDone(appName: string) {
  outro(
    "Awesome! Your project is ready to rock! " +
      "Run the following command to start development:",
  );

  console.log(colors.cyan(`cd ${appName} && ${startCommand()}`));

  console.log();

  console.log(
    `Pro tip: Install the ${colors.yellow(
      "Generator Z",
    )} extension in VSCode for helpful code snippets and productivity boosters!`,
  );
}
