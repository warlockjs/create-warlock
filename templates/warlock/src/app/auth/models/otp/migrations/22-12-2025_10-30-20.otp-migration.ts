import { migrationOffice } from "@warlock.js/cascade";
import { OTP } from "../otp.model";

const otpBlueprint = OTP.blueprint();

export default migrationOffice.register({
  name: "otp",
  createdAt: "22-12-2025_10-30-20",
  blueprint: otpBlueprint,
  up: async () => {
    await otpBlueprint.index("code");
    await otpBlueprint.index(["target", "type"]);
    await otpBlueprint.index("expiresAt");
    await otpBlueprint.index("userId");
  },
  down: async () => {
    await otpBlueprint.dropIndex("code");
    await otpBlueprint.dropIndex("target", "type");
    await otpBlueprint.dropIndex("expiresAt");
    await otpBlueprint.dropIndex("userId");
  },
});
