import { type RequestHandler } from "@warlock.js/core";
import { HomePageComponent } from "../components/HomePageComponent";

/**
 * React-rendered welcome page — kept only when the `react` feature is selected.
 *
 * This file and its plain-JSON sibling (`home-page.controller.ts`) are a
 * mutually exclusive PAIR: both export `homePageController`, and the scaffolder
 * (`configureHomePage`) deletes exactly one at generation time, so a real
 * project never contains both. They coexist here in the template on purpose —
 * this is not resolver-order ambiguity, and neither file is dead code.
 */
export const homePageController: RequestHandler = async ({ response }) => {
  return response.render(<HomePageComponent />);
};

homePageController.description = "Welcome Home Page";
