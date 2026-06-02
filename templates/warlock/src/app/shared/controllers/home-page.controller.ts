import { Application, type RequestHandler } from "@warlock.js/core";

/**
 * Default welcome route — a dependency-free JSON response.
 *
 * Projects scaffolded with the `react` feature get the richer HTML welcome
 * page (`home-page.controller.tsx` + `HomePageComponent.tsx`) instead; this
 * plain controller is removed at scaffold time when React is selected.
 */
export const homePageController: RequestHandler = async (_request, response) => {
  return response.success({
    message: "Welcome to Warlock 🧙 — your app is up and running!",
    version: Application.version,
    docs: "https://warlock.js.org",
  });
};

homePageController.description = "Welcome Home Page";
