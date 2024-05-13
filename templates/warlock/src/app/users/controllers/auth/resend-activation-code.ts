import { Random } from "@mongez/reinforcements";
import type { Request, Response } from "@warlock.js/core";
import { ExistsRule } from "@warlock.js/core";
import { User } from "app/users/models/user";

export default async function resendActivationCode(
  request: Request,
  response: Response,
) {
  //
  const user = await User.first({
    email: request.input("email"),
  });

  if (!user) {
    return response.badRequest({
      error: "User not found",
    });
  }

  if (user.get("isActive")) {
    return response.badRequest({
      error: "User already activated",
    });
  }

  user
    .save({
      activationCode: Random.int(100000, 999999),
      codeExpiresAt: true,
    })
    .then(() => {
      // send mail
    });

  return response.success({
    message: "Activation code sent",
  });
}

resendActivationCode.validation = {
  rules: {
    email: ["required", "email", new ExistsRule(User, "email").insensitive()],
  },
};
