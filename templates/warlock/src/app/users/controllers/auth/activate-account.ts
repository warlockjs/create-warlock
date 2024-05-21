import type { Request, Response } from "@warlock.js/core";
import usersRepository from "app/users/repositories/users-repository";


export default async function activateAccount(
  request: Request,
  response: Response,
) {
  const currentUser = request.user;

  currentUser.unset("codeExpiresAt", "activationCode");

  currentUser.save({
    isActive: true,
    activatedAt: new Date(),
  });

  const accessToken = await currentUser.generateAccessToken();

  return response.success({
    user: {
      ...(await currentUser.toJSON()),
      accessToken: accessToken,
      userType: currentUser.userType,
    },
  });
}

activateAccount.validation = {
  rules: {
    code: ["required"],
    email: ["required", "email"],
  },
  validate: async (request: Request, response: Response) => {
    const user = await usersRepository.first({
      isActive: false,
      email: request.input("email"),
      activationCode: request.int("code"),
    });

    if (!user) {
      return response.notFound({
        error: "Invalid activation code",
      });
    }

    request.user = user;
  },
};
