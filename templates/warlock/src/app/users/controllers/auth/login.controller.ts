import {
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";
import { User } from "app/users/models/user";
import { loginUserService } from "app/users/services/login.service";
import {
  loginSchema,
  type LoginData,
} from "app/users/validation/login.validation";

export const loginController: RequestHandler = async (
  request: Request<LoginData>,
  response: Response,
) => {
  const user = await User.attempt(request.validated());

  if (!user) {
    return response.badRequest({
      error: "Invalid credentials",
    });
  }

  const loginData = await loginUserService(user);

  return response.success(loginData);
};

loginController.validation = {
  schema: loginSchema,
};
