import { createTailwindReactApp } from "src/commands/vite-react/tailwind-css";
import { Application } from "../create-new-app/types";
import { createHeadlessUIReactApp } from "./headless-ui";
import { createReactMantineMoonlightApp } from "./mantine";
import selectReactAppType from "./select-react-app";

// TODO: add slim feature
// TODO: add mongez.json file in workspace for quick installation
// TODO: add color, api, locales and other dot env details in cli for replacements
export default async function createReactApp({
  appName,
  appPath,
}: Required<Application>) {
  const { type: appType } = await selectReactAppType();

  if (appType === "basic") {
    return await createHeadlessUIReactApp({ appName, appPath });
  } else if (appType === "mantine") {
    return await createReactMantineMoonlightApp({ appName, appPath });
  } else if (appType === "tailwind") {
    return await createTailwindReactApp({ appName, appPath });
  }
}
