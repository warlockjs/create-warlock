import { Model, RegisterModel } from "@warlock.js/cascade";
import { type Infer, v } from "@warlock.js/seal";
import { globalColumnsSchema } from "app/shared/utils/global-columns-schema";

const otpSchema = globalColumnsSchema.extend({
  code: v.string().required(),
  type: v.string().required(),
  target: v.string().required(),
  channel: v.string().required(),
  userId: v.number().required(),
  userType: v.string().required(),
  expiresAt: v.date().required(),
  usedAt: v.date().optional(),
  attempts: v.number().default(0),
  maxAttempts: v.number().default(5),
  metadata: v.record(v.any()).optional(),
});

type OTPSchema = Infer<typeof otpSchema>;

@RegisterModel()
export class OTP extends Model<OTPSchema> {
  /**
   * Table name
   */
  public static table = "otps";

  /**
   * Model schema
   */
  public static schema = otpSchema;

  /**
   * Check if OTP is valid (not expired, not used, not max attempts)
   */
  public get isValid(): boolean {
    if (this.get("usedAt")) return false;
    if (this.get("attempts") >= this.get("maxAttempts")) return false;
    if (new Date() > new Date(this.get("expiresAt"))) return false;
    return true;
  }

  /**
   * Check if OTP is expired
   */
  public get isExpired(): boolean {
    return new Date() > new Date(this.get("expiresAt"));
  }

  /**
   * Check if max attempts exceeded
   */
  public get isMaxAttemptsExceeded(): boolean {
    return this.get("attempts") >= this.get("maxAttempts");
  }

  /**
   * Mark OTP as used
   */
  public async markAsUsed(): Promise<this> {
    return this.set("usedAt", new Date()).save();
  }

  /**
   * Increment failed attempt
   */
  public async incrementAttempt(): Promise<this> {
    return this.set("attempts", this.get("attempts") + 1).save();
  }
}
