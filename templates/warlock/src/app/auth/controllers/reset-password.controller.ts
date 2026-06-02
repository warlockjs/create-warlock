import { t, type Request, type RequestHandler } from "@warlock.js/core";
import { type ResetPasswordSchema, resetPasswordSchema } from "../schema/reset-password.schema";
import { resetPasswordService } from "../services/reset-password.service";

/**
 * Reset password controller
 */
export const resetPasswordController: RequestHandler<Request<ResetPasswordSchema>> = async (
  request,
  response,
) => {
  await resetPasswordService(request.validated());

  return response.success({
    message: t("auth.passwordResetSuccess"),
  });
};

resetPasswordController.description = "Reset password with OTP";

resetPasswordController.validation = {
  schema: resetPasswordSchema,
};
