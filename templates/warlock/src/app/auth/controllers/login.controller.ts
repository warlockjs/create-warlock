import { t, type RequestHandler, type Response } from "@warlock.js/core";
import { loginSchema, type LoginRequest } from "../requests/login.request";
import { loginService } from "../services/auth.service";

/**
 * Login controller
 * POST /auth/login
 */
export const login: RequestHandler = async (request: LoginRequest, response: Response) => {
  const result = await loginService(request.validated(), {
    userAgent: request.userAgent,
    ip: request.ip,
  });

  if (!result) {
    return response.unauthorized({
      error: t("auth.invalidCredentials"),
    });
  }

  return response.success(result);
};

login.description = "User Login";

login.validation = {
  schema: loginSchema,
};
