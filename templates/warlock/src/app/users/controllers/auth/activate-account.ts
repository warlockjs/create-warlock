import type { Request, Response } from "@warlock.js/core";
import { User } from "app/users/models/user";

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
    const user = await User.aggregate()
      .where("email", String(request.input("email")).toLowerCase())
      .where("isActive", false)
      .where("activationCode", request.input("code"))
      .first();

    if (!user) {
      return response.notFound({
        error: "Invalid activation code",
      });
    }

    request.user = user;
  },
};
