import type { Request, Response } from "@warlock.js/core";
import { User } from "app/users/models/user";
import { loginUserService } from "app/users/services/login.service";
import {
  adminLoginSchema,
  type AdminLoginData,
} from "app/users/validation/admin-login.validation";

export default async function adminLoginController(
  request: Request<AdminLoginData>,
  response: Response,
) {
  const user = request.user;

  const loginData = await loginUserService(user);

  return response.success(loginData);
}

adminLoginController.validation = {
  schema: adminLoginSchema,
  validate: async (request: Request, response: Response) => {
    const user = await User.attempt(request.validated());

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
