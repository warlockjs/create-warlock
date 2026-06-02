import { t, type Request, type RequestHandler, type Response } from "@warlock.js/core";
import { v } from "@warlock.js/seal";
import { forgotPasswordService } from "../services/forgot-password.service";

/**
 * Forgot password controller
 * POST /auth/forgot-password
 */
export const forgotPasswordController: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  const { email } = request.validated();

  await forgotPasswordService(email);

  return response.success({
    message: t("auth.otpSent"),
  });
};

forgotPasswordController.description = "Request password reset";

forgotPasswordController.validation = {
  schema: v.object({
    email: v.email().required(),
  }),
};
