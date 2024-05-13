import { Application } from "../../create-new-app/types";
import {
  addStylesDependencies,
  allDone,
  copyTemplateFiles,
  initializeGitRepository,
  installDependencies,
  updateEnvFile,
} from "./../../..//helpers/project-builder-helpers";

export async function createHeadlessUIReactApp({
  appName,
  appPath,
}: Pick<Application, "appName" | "appPath">) {
  await copyTemplateFiles("vite-react-headless-ui", appPath, appName);

  await updateEnvFile(appPath, appName);
  await addStylesDependencies(appPath);
  await installDependencies(appPath);
  await initializeGitRepository(appPath);
  await allDone(appName);
}
