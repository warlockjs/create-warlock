import { authService } from "@warlock.js/auth";
import { BadRequestError, t } from "@warlock.js/core";
import { User } from "app/users/models/user";
import { AuthErrorCode } from "../utils/auth-error-code";
import { verifyOtpService } from "./otp.service";

/**
 * Reset user password using OTP verification
 */
export async function resetPasswordService(
  email: string,
  code: string,
  newPassword: string,
): Promise<User> {
  // Verify OTP
  const otp = await verifyOtpService(code, email, "password-reset");

  // Find user
  const user = await User.find(otp.get("userId"));

  if (!user) {
    throw new BadRequestError(t("auth.otpInvalid"), {
      errorCode: AuthErrorCode.OTP_INVALID,
    });
  }

  // Update password
  await user.set("password", newPassword).save();

  // Revoke all tokens (force re-login)
  // Or make it an option through user decision.
  await authService.revokeAllTokens(user);

  return user;
}
