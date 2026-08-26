import { authService } from "@warlock.js/auth";
import { scheduler } from "app/shared/services/scheduler.service";
import { cleanupExpiredOtpsService } from "./services/otp.service";

// Cleanup expired OTPs every hour
scheduler.newJob("cleanup-expired-otps", cleanupExpiredOtpsService).everyHour();

// Cleanup expired refresh tokens every hour
scheduler.newJob("cleanup-expired-tokens", () => authService.cleanupExpiredTokens()).everyHour();

// Registering jobs does not schedule them — without this, a fresh project's very
// first `warlock dev` printed "scheduler.start() was never called" and neither
// cleanup ever ran.
//
// Safe to call here: `start()` throws on an empty scheduler, and the two jobs
// above are registered directly before it. Jobs registered later by other
// modules still run — `addJob` prepares them when the scheduler is already
// running.
scheduler.start();
