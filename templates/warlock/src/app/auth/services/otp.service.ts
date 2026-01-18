import type { Duration } from "@warlock.js/auth";
import { ForbiddenError, t } from "@warlock.js/core";
import { OTP } from "../models/otp";
import { AuthErrorCode } from "../utils/auth-error-code";
import type { OTPChannel, OTPType } from "../utils/types";

// Default OTP expiration
const DEFAULT_OTP_EXPIRATION: Duration = { minutes: 15 };

// Parse duration to milliseconds
function parseDurationToMs(duration: Duration): number {
  let ms = 0;
  if (duration.milliseconds) ms += duration.milliseconds;
  if (duration.seconds) ms += duration.seconds * 1000;
  if (duration.minutes) ms += duration.minutes * 60 * 1000;
  if (duration.hours) ms += duration.hours * 60 * 60 * 1000;
  if (duration.days) ms += duration.days * 24 * 60 * 60 * 1000;
  if (duration.weeks) ms += duration.weeks * 7 * 24 * 60 * 60 * 1000;
  return ms;
}

export type CreateOTPOptions = {
  target: string;
  channel: OTPChannel;
  type: OTPType;
  userId?: number;
  userType?: string;
  expiresIn?: Duration;
  length?: number;
  alphanumeric?: boolean;
  maxAttempts?: number;
  metadata?: object;
};

/**
 * Generate OTP code
 */
function generateCode(
  length: number = 6,
  alphanumeric: boolean = false,
): string {
  if (alphanumeric) {
    // Generate alphanumeric code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  // Generate numeric code
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Create a new OTP
 */
export async function createOtpService(
  options: CreateOTPOptions,
): Promise<OTP> {
  const {
    target,
    channel,
    type,
    userId,
    userType,
    expiresIn = DEFAULT_OTP_EXPIRATION,
    length = 6,
    alphanumeric = false,
    maxAttempts = 5,
    metadata,
  } = options;

  // Invalidate any existing unused OTPs for this target+type
  await cleanupOtpService(target, type);

  const code = generateCode(length, alphanumeric);
  const expiresAt = new Date(Date.now() + parseDurationToMs(expiresIn));

  return OTP.create({
    code,
    type,
    target,
    channel,
    userId,
    userType,
    expiresAt,
    maxAttempts,
    metadata,
  });
}

/**
 * Verify an OTP
 */
export async function verifyOtpService(
  code: string,
  target: string,
  type: OTPType,
): Promise<OTP | never> {
  const otp = await OTP.first({
    code,
    target,
    type,
    usedAt: null,
  });

  if (!otp) {
    throw new ForbiddenError(t("auth.missingOtp"), {
      errorCode: AuthErrorCode.OTP_NOT_FOUND,
    });
  }

  if (otp.isExpired) {
    throw new ForbiddenError(t("auth.otpExpired"), {
      errorCode: AuthErrorCode.OTP_EXPIRED,
    });
  }

  if (otp.isMaxAttemptsExceeded) {
    throw new ForbiddenError(t("auth.otpMaxAttempts"), {
      errorCode: AuthErrorCode.OTP_MAX_ATTEMPTS,
    });
  }

  // Mark as used
  await otp.markAsUsed();

  return otp;
}

export async function cleanupOtpService(
  target: string,
  type: OTPType,
): Promise<void> {
  await OTP.delete({
    target,
    type,
    usedAt: null,
  });
}

/**
 * Resend OTP (invalidate old and create new)
 */
export async function resendOtpService(
  target: string,
  type: OTPType,
  channel: OTPChannel,
  options?: Partial<CreateOTPOptions>,
): Promise<OTP> {
  await cleanupOtpService(target, type);
  return createOtpService({
    target,
    type,
    channel,
    ...options,
  });
}

/**
 * Cleanup expired OTPs
 */
export async function cleanupExpiredOtpsService(): Promise<number> {
  const expiredOtps = await OTP.query()
    .where("expiresAt", "<", new Date())
    .get();

  await Promise.all(expiredOtps.map(otp => otp.destroy()));

  return expiredOtps.length;
}
