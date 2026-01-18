import { type Request, type RequestHandler, type Response } from "@warlock.js/core";
import { usersRepository } from "../repositories/users.repository";

export const getUsersController: RequestHandler = async (request: Request, response: Response) => {
  const users = await usersRepository.listCached({
    ...request.all(),
    simpleSelect: true,
  });

  return response.success({
    users,
  });
};

getUsersController.description = "Get Users Controller";
