import { t, v, type Request, type RequestHandler, type Response } from "@warlock.js/core";
import { usersRepository } from "app/users/repositories/users.repository";
import { createOtpService } from "../services/otp.service";

/**
 * Forgot password controller
 * POST /auth/forgot-password
 */
export const forgotPassword: RequestHandler = async (request: Request, response: Response) => {
  const { email } = request.validated();

  // Find user by email (silent fail for security)
  const user = await usersRepository.first({ email });

  if (!user) {
    // Silent success - don't reveal if email exists
    return response.success({
      message: t("auth.otpSent"),
    });
  }

  // Create OTP
  const otp = await createOtpService({
    target: email,
    channel: "email",
    type: "password-reset",
    userId: user.id,
    userType: user.userType,
  });

  // TODO: Send email with OTP code
  // await sendPasswordResetEmail(user, otp.get("code"));
  console.log(`[DEV] Password reset OTP for ${email}: ${otp.get("code")}`);

  // Always return success for security (don't reveal if email exists)
  return response.success({
    message: t("auth.otpSent"),
  });
};

forgotPassword.description = "Request password reset";

forgotPassword.validation = {
  schema: v.object({
    email: v.string().email().required(),
  }),
};
