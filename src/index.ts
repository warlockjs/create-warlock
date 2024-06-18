import { getJsonFile } from "@mongez/fs";
import createNewApp from "./commands/create-new-app";
import { packageRoot } from "./helpers/paths";

export default function createApp() {
  const packageJson: any = getJsonFile(packageRoot("package.json"));
  const createWarlockVersion = packageJson.version;
  createNewApp(createWarlockVersion);
}
