import { Application, type RequestHandler } from "@warlock.js/core";

/** The dependency-free home response for applications without the web feature. */
export const homePageController: RequestHandler = async ({ response }) => {
  return response.success({
    message: "Welcome to Warlock 🧙 — your app is up and running!",
    version: Application.version,
    docs: "https://warlock.js.org",
  });
};

homePageController.description = "Welcome Home Page";
