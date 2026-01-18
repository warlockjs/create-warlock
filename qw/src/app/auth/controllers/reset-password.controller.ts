import { t, type Response } from "@warlock.js/core";
import { resetPasswordSchema, type ResetPasswordRequest } from "../requests/reset-password.request";
import { resetPasswordService } from "../services/reset-password.service";

/**
 * Reset password controller
 */
export const resetPasswordController = async (
  request: ResetPasswordRequest,
  response: Response,
) => {
  const { email, code, newPassword } = request.validated();

  await resetPasswordService(email, code, newPassword);

  return response.success({
    message: t("auth.passwordResetSuccess"),
  });
};

resetPasswordController.description = "Reset password with OTP";

resetPasswordController.validation = {
  schema: resetPasswordSchema,
};
