import { outro } from "@clack/prompts";
import { colors } from "@mongez/copper";
import {
  copyDirectory,
  getFile,
  getJsonFile,
  putFile,
  putJsonFile,
  renameFile,
} from "@mongez/fs";
import path from "path";
import { executeCommand } from "./exec";
import { startCommand } from "./package-manager";
import { Template, template } from "./paths";

export async function initializeGitRepository(appPath: string) {
  // initialize git repository
  await executeCommand(`git`, ["init"], appPath);
  // switching to `main` branch
  await executeCommand(`git`, ["checkout", "-b", "main"], appPath);

  // add files
  await executeCommand(`git`, ["add", "."], appPath);

  // commit files
  await executeCommand(`git`, ["commit", "-m", "Initial commit ⚡️"], appPath);

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
    "🌟 Awesome! Your project is ready to rock! " +
      "Run the following command to start development:",
  );

  console.log(colors.cyan(`cd ${appName} && ${startCommand()}`));

  console.log();

  console.log(
    `💡 Pro tip: Install the ${colors.yellow(
      "Generator Z",
    )} extension in VSCode for helpful code snippets and productivity boosters! 🚀`,
  );
}
