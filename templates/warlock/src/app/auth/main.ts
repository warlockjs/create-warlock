import { onceConnected } from "@warlock.js/cascade";
import { Job } from "@warlock.js/scheduler";
import { scheduler } from "app/shared/services/scheduler.service";
import { cleanupExpiredOtpsService } from "./services/otp.service";

onceConnected(() => {
  const cleanupJob = new Job("cleanup-expired-otps", cleanupExpiredOtpsService).everyHour();
  scheduler.addJob(cleanupJob);
});
