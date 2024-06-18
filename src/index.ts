import packageJson from "../package.json";
import createNewApp from "./commands/create-new-app";

export default function createApp() {
  const createWarlockVersion = packageJson.version;
  createNewApp(createWarlockVersion);
}
