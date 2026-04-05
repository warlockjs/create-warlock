import { t, type Response } from "@warlock.js/core";
import { type ResetPasswordRequest } from "../requests/reset-password.request";
import { resetPasswordSchema } from "../schema/reset-password.schema";
import { resetPasswordService } from "../services/reset-password.service";

/**
 * Reset password controller
 */
export const resetPasswordController = async (
  request: ResetPasswordRequest,
  response: Response,
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
