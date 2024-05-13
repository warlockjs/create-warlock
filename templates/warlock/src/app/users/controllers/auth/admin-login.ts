import type { Request, Response } from "@warlock.js/core";
import { User } from "app/users/models/user";

export default async function adminLogin(request: Request, response: Response) {
  const user = request.user;

  const auth = await user.generateAccessToken();

  return response.success({
    user: {
      ...(await user.toJSON()),
      accessToken: auth,
      userType: user.userType,
    },
  });
}

adminLogin.validation = {
  rules: {
    password: ["required"],
    email: ["required", "email"],
  },
  validate: async (request: Request, response: Response) => {
    const user = await User.attempt(request.only(["email", "password"]));

    if (!user) {
      return response.badRequest({
        error: "Invalid credentials",
      });
    }

    if (!user.get("isActive")) {
      return response.badRequest({
        error: "Your account is suspended!",
      });
    }

    request.user = user;
  },
};
