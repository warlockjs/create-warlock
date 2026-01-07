import { migrate } from "@warlock.js/cascade";
import { OTP } from "../otp.model";

export default migrate(OTP, {
  name: "otp",
  createdAt: "2025-12-22T10:30:20", // ISO Date
  up() {
    this.index("code");
    this.index(["target", "type"]);
    this.index("expiresAt");
    this.index("userId");
  },
  down() {
    this.dropIndex("code");
    this.dropIndex(["target", "type"]);
    this.dropIndex("expiresAt");
    this.dropIndex("userId");
  },
});
