import { t, type Request, type Response } from "@warlock.js/core";
import { User } from "app/users/models/user";

export default async function login(
  request: Request<User>,
  response: Response,
) {
  const user = request.user;

  const auth = await user.generateAccessToken();

  user.save({
    lastLogin: new Date(),
  });

  return response.success({
    user: {
      ...(await user.toJSON()),
      accessToken: auth,
      userType: user.userType,
    },
  });
}

login.validation = {
  rules: {
    email: ["required", "email"],
    password: ["required", "string"],
  },
  validate: async (request: Request, response: Response) => {
    const user = await User.attempt(request.only(["email", "password"]));

    if (!user) {
      return response.badRequest({
        error: t("auth.invalidCredentials"),
      });
    }

    if (!user.isActive) {
      // you can send the activation code again
      // or just return a bad request with an error message
      return response.forbidden({
        error: t("auth.accountNotActivated"),
      });
    }

    request.user = user;
  },
};
