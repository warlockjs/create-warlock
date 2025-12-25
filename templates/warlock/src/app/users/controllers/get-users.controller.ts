import { type Request, type RequestHandler, type Response } from "@warlock.js/core";
import { getUsersService } from "../services/get-users.service";

export const getUsersController: RequestHandler = async (request: Request, response: Response) => {
  return response.success({
    users: await getUsersService(),
  });
};

getUsersController.description = "Get Users Controller";
