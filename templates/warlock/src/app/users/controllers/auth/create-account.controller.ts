import type { Request, RequestHandler, Response } from "@warlock.js/core";
import type { User } from "app/users/models/user";
import { createAccountService } from "app/users/services/create-account.service";
import { loginUserService } from "app/users/services/login.service";
import { createAccountSchema } from "app/users/validation/create-account.validation";

export const createAccountController: RequestHandler = async (
  request: Request<User>,
  response: Response,
) => {
  const user = await createAccountService(request.validated()); //

  request.guest = request.user;
  request.user = user;

  return response.success({
    user: await loginUserService(user),
  });
};

createAccountController.validation = {
  schema: createAccountSchema,
};
