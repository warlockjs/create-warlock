import { type GuardedRequestHandler } from "app/auth/requests/guarded.request";
import { usersRepository } from "../repositories/users.repository";

export const listUsersController: GuardedRequestHandler = async (request, response) => {
  const users = await usersRepository.listCached(request.all());

  return response.success({
    users,
  });
};

listUsersController.description = "List Users Controller";
