import { type RequestHandler, type Response } from "@warlock.js/core";
import { type LoginRequest } from "../requests/login.request";
import { loginSchema } from "../schema/login.schema";
import { loginService } from "../services/auth.service";

/**
 * Login controller
 * POST /auth/login
 */
export const loginController: RequestHandler = async (
  request: LoginRequest,
  response: Response,
) => {
  const result = await loginService(request.validated(), {
    userAgent: request.userAgent,
    ip: request.ip,
  });

  return response.success(result);
};

loginController.description = "User Login";

loginController.validation = {
  schema: loginSchema,
};
