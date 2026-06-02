import { type Request, type RequestHandler } from "@warlock.js/core";
import { type LoginSchema, loginSchema } from "../schema/login.schema";
import { loginService } from "../services/auth.service";

/**
 * Login controller
 * POST /auth/login
 */
export const loginController: RequestHandler<Request<LoginSchema>> = async (request, response) => {
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
