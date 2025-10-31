import type { Request, RequestHandler, Response } from "@warlock.js/core";
import { createAccountService } from "app/users/services/account.service";
import { loginUserService } from "app/users/services/login.service";
import {
  createAccountSchema,
  type CreateAccountData,
} from "app/users/validation/create-account.validation";

export const createAccountController: RequestHandler = async (
  request: Request<CreateAccountData>,
  response: Response,
) => {
  const user = await createAccountService(request.validated());

  request.guest = request.user;
  request.user = user;

  return response.success({
    user: await loginUserService(user),
  });
};

createAccountController.validation = {
  schema: createAccountSchema,
};
