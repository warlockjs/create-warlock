import {
  addStylesDependencies,
  allDone,
  copyTemplateFiles,
  initializeGitRepository,
  installDependencies,
  updateEnvFile,
} from "../../../helpers/project-builder-helpers";
import { Application } from "../../create-new-app/types";

export async function createTailwindReactApp({
  appName,
  appPath,
}: Pick<Application, "appName" | "appPath">) {
  await copyTemplateFiles("vite-react-tailwind-css", appPath, appName);

  await updateEnvFile(appPath, appName);
  await addStylesDependencies(appPath);
  await installDependencies(appPath);
  await initializeGitRepository(appPath);
  await allDone(appName);
}
