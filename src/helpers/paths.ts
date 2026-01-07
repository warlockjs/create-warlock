import path from "path";

const root = process.cwd();

const packageRootPath = root + "/node_modules/create-warlock";

console.log("Executing from", packageRootPath);

export type Template = "warlock";

export function template(templateName: Template): string {
  return path.resolve(packageRootPath, "templates", templateName);
}

export function packageRoot(...paths: string[]): string {
  return path.resolve(packageRootPath, ...paths);
}
