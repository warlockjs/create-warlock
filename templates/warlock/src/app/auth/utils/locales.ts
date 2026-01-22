import { groupedTranslations } from "@warlock.js/core";

groupedTranslations("auth", {
  // App-level translations
  invalidCredentials: {
    en: "Invalid email or password",
    ar: "البريد الالكتروني أو كلمة المرور غير صحيحة",
  },
  loggedOut: {
    en: "Logged out successfully",
    ar: "تم تسجيل الخروج بنجاح",
  },
  loggedOutAll: {
    en: "Logged out from all devices",
    ar: "تم تسجيل الخروج من جميع الأجهزة",
  },
  refreshTokenRequired: {
    en: "Refresh token is required",
    ar: "رمز التحديث مطلوب",
  },
  invalidRefreshToken: {
    en: "Invalid or expired refresh token",
    ar: "رمز التحديث غير صالح أو منتهي الصلاحية",
  },

  userNotFound: {
    en: "User not found",
    ar: "المستخدم غير موجود",
  },

  // OTP translations
  otpSent: {
    en: "Verification code sent",
    ar: "تم إرسال رمز التحقق",
  },
  missingOtp: {
    en: "Verification code not found",
    ar: "رمز التحقق غير موجود",
  },
  otpInvalid: {
    en: "Invalid verification code",
    ar: "رمز التحقق غير صالح",
  },
  otpExpired: {
    en: "Verification code has expired",
    ar: "رمز التحقق منتهي الصلاحية",
  },
  otpMaxAttempts: {
    en: "Too many failed attempts",
    ar: "عدد المحاولات تجاوز الحد المسموح",
  },
  passwordResetSuccess: {
    en: "Password reset successfully",
    ar: "تم إعادة تعيين كلمة المرور بنجاح",
  },

  /**
   * ============================================
   * @warlock.js/auth package translations
   * ============================================
   * The following translations are used by the @warlock.js/auth package
   * in the auth middleware. They must be defined here so they can be
   * translated in your application.
   */
  errors: {
    /**
     * Called when the access token is missing from Authorization header
     */
    missingAccessToken: {
      en: "Access token is required",
      ar: "رمز الوصول مطلوب",
    },
    /**
     * Called when an access token is invalid or expired
     */
    invalidAccessToken: {
      en: "Invalid or expired access token",
      ar: "رمز الوصول غير صالح أو منتهي الصلاحية",
    },
    /**
     * Called when the current user type is not authorized to
     * access a protected resource for certain user types
     */
    unauthorized: {
      en: "You are not authorized to access this resource",
      ar: "غير مصرح لك بالوصول إلى هذا المورد",
    },
  },
});
