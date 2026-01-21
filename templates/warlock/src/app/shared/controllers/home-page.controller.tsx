import { type Request, type RequestHandler, type Response } from "@warlock.js/core";
import { HomePageComponent } from "../components/HomePageComponent";

export const homePageController: RequestHandler = async (request: Request, response: Response) => {
  // your code here

  return response.render(<HomePageComponent />);
};

homePageController.description = "Home Page Controller";
