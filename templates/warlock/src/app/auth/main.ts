import { authService } from "@warlock.js/auth";
import { scheduler } from "app/shared/services/scheduler.service";
import { cleanupExpiredOtpsService } from "./services/otp.service";

// Cleanup expired OTPs every hour
scheduler.newJob("cleanup-expired-otps", cleanupExpiredOtpsService).everyHour();

// Cleanup expired refresh tokens every hour
scheduler
  .newJob("cleanup-expired-tokens", () => authService.cleanupExpiredTokens())
  .everyHour();
