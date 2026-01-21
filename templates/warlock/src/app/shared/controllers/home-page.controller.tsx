import {
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";
import { HomePageComponent } from "../components/HomePageComponent";

export const homePageController: RequestHandler = async (
  _request: Request,
  response: Response,
) => {
  return response.render(<HomePageComponent />);
};

homePageController.description = "Welcome Home Page";
