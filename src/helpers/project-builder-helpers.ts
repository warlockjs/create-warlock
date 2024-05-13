import { confirm, outro, spinner } from "@clack/prompts";
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
import { executeCommand, runCommand } from "./exec";
import { getPackageManager, startCommand } from "./package-manager";
import { Template, template } from "./paths";

export async function initializeGitRepository(appPath: string) {
  if (
    (await confirm({
      message: "Do you want to initialize a git repository?",
      initialValue: true,
    })) === false
  )
    return false;

  const loading = spinner();

  loading.start("📂 Initializing git repository 🚀");

  // initialize git repository
  await executeCommand(`git`, ["init"], appPath);
  // switching to `main` branch
  await executeCommand(`git`, ["checkout", "-b", "main"], appPath);

  // add files
  await executeCommand(`git`, ["add", "."], appPath);

  // commit files
  await executeCommand(`git`, ["commit", "-m", "Initial commit ⚡️"], appPath);

  loading.stop("📂 Git initialized 🔗");

  return true;
}

export async function installDependencies(appPath: string) {
  const result = await runCommand(getPackageManager(), ["install"], appPath);

  const confirmed = await confirm({
    message: "Do you want to install the project dependencies?",
    initialValue: true,
  });

  if (confirmed === false) {
    result.abort();

    return false;
  }

  const loading = spinner();

  loading.start("📦 Installing dependencies ⏳");

  await result.install;

  loading.stop("📦 Dependencies installed successfully ✅");

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
    "🌟 " +
      colors.bgGreenBright("DONE") +
      " now you're ready to go! Type the following or copy/paste it into your terminal to get started 🚀 ✅",
  );

  console.log(colors.cyan(`cd ${appName} && ${startCommand()}`));

  // make an empty line
  console.log();

  console.log(
    `If you are using VSCode, it's recommended to install the 🛠️ ${colors.yellow(
      `Generator Z`,
    )} extension. It generates code snippets for you! 🚀`,
  );
}
