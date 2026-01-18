import { authService } from "@warlock.js/auth";
import { onceConnected } from "@warlock.js/cascade";
import { scheduler } from "app/shared/services/scheduler.service";
import { cleanupExpiredOtpsService } from "./services/otp.service";

onceConnected(() => {
  // Cleanup expired OTPs every hour
  scheduler.newJob("cleanup-expired-otps", cleanupExpiredOtpsService).everyHour();

  // Cleanup expired refresh tokens every hour
  scheduler.newJob("cleanup-expired-tokens", () => authService.cleanupExpiredTokens()).everyHour();
});
