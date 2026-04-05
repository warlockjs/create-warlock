import {
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";
import { usersRepository } from "../repositories/users.repository";

export const listUsersController: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  const users = await usersRepository.listCached({
    ...request.all(),
  });

  return response.success({
    users,
  });
};

listUsersController.description = "List Users Controller";
