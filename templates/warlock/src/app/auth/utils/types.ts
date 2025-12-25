/**
 * OTP delivery channels
 */
export type OTPChannel = "email" | "sms" | "whatsapp" | "push";

/**
 * Common OTP types
 */
export type OTPType =
  | "password-reset"
  | "email-verification"
  | "phone-verification"
  | "two-factor"
  | string;
