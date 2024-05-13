import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export type Template = "warlock";

export function template(templateName: Template): string {
  return path.resolve(__dirname, "../", "../", "templates", templateName);
}

export function packageRoot(...paths: string[]): string {
  return path.resolve(__dirname, "../", "../", ...paths);
}
