import { fileURLToPath } from "url";
import createNewApp from "./commands/create-new-app";

const __filename = fileURLToPath(import.meta.url);

export default function createApp() {
  createNewApp();
}
