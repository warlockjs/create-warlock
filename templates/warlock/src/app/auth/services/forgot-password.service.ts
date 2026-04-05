import { getFirstUserService } from "app/users/services/list-users.service";
import { createOtpService } from "./otp.service";

/**
 * Example Usage:
 * await forgotPasswordService("user@example.com");
 */

/**
 * Handle forgot password request
 *
 * @param email - User email address
 * @returns Promise<void>
 */
export async function forgotPasswordService(email: string): Promise<void> {
  // Find user by email (silent fail for security)
  const user = await getFirstUserService({ email });

  // Create OTP
  const otp = await createOtpService({
    target: email,
    channel: "email",
    type: "password-reset",
    userId: user.id,
    userType: user.userType,
  });

  // TODO: Send email with OTP code using a mail service
  // await sendPasswordResetEmail(user, otp.get("code"));
}
