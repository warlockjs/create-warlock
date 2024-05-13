import { getJsonFile } from "@mongez/fs";
import { program } from "commander";
import * as path from "path";
import { fileURLToPath } from "url";
import createNewApp from "./commands/create-new-app";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export default function createApp() {
  const packageJson: any = getJsonFile(
    path.resolve(__dirname, "../", "package.json"),
  );

  program.version(packageJson["version"]);

  createNewApp();
}
