import { Application } from "../../create-new-app/types";
import {
  addStylesDependencies,
  allDone,
  copyTemplateFiles,
  initializeGitRepository,
  installDependencies,
  updateEnvFile,
} from "./../../../helpers/project-builder-helpers";

// TODO: add slim feature
// TODO: add mongez.json file in workspace for quick installation
// TODO: add color, api, locales and other dot env details in cli for replacements
export async function createReactMantineMoonlightApp({
  appName,
  appPath,
}: Pick<Application, "appName" | "appPath">) {
  await copyTemplateFiles("vite-react-mantine-moonlight", appPath, appName);
  await updateEnvFile(appPath, appName);
  await addStylesDependencies(appPath);
  await installDependencies(appPath);
  await initializeGitRepository(appPath);
  await allDone(appName);
}
