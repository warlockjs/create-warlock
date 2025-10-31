import { ExistsRule, type Request, type Response } from "@warlock.js/core";
import { User } from "app/users/models/user";

export default async function resetPassword(
  request: Request<User>,
  response: Response,
) {
  const currentUser = request.user;

  currentUser.unset("activationCode", "codeExpiresAt");

  currentUser.save({
    password: request.input("password"),
  });

  request.clearCurrentUser();

  return response.success();
}

resetPassword.validation = {
  rules: {
    email: ["required", "email", new ExistsRule(User, "email").insensitive()],
    password: ["required", "confirmed", "minLength:8"],
    code: ["required", "int", "length:6"],
  },
  validate: async (request: Request, response: Response) => {
    try {
      const user = await User.first({
        email: request.input("email"),
        activationCode: request.int("code"),
      });

      if (!user) {
        return response.notFound();
      }

      request.user = user;
    } catch (error: any) {
      return response.badRequest(error.message);
    }
  },
};
