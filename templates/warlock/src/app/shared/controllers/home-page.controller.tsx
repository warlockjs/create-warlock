import { type RequestHandler } from "@warlock.js/core";
import { HomePageComponent } from "../components/HomePageComponent";

export const homePageController: RequestHandler = async ({ response }) => {
  return response.render(<HomePageComponent />);
};

homePageController.description = "Welcome Home Page";
