import type { Request, Response } from "@warlock.js/core";
import { usersRepository } from "app/users/repositories/users.repository";
import { loginUserService } from "app/users/services/login.service";
import {
  activateAccountSchema,
  type ActivateAccountData,
} from "app/users/validation/activate-account.validation";

export default async function activateAccountController(
  request: Request<ActivateAccountData>,
  response: Response,
) {
  const currentUser = request.user;

  currentUser.unset("codeExpiresAt", "activationCode");

  currentUser.save({
    isActive: true,
    activatedAt: new Date(),
  });

  const loginData = await loginUserService(currentUser);

  return response.success(loginData);
}

activateAccountController.validation = {
  schema: activateAccountSchema,
  validate: async (request: Request, response: Response) => {
    const user = await usersRepository.first({
      email: request.input("email"),
      activationCode: request.int("code"),
    });

    if (!user) {
      return response.notFound({
        error: "Invalid activation code",
      });
    }

    if (user.isActive) {
      return response.badRequest({
        error: "User already activated",
      });
    }

    request.user = user;
  },
};
