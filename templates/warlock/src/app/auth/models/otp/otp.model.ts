import { Model, type Casts, type Document } from "@warlock.js/cascade";

export class OTP extends Model {
  /**
   * Collection name
   */
  public static collection = "otps";

  /**
   * Default value for model data
   */
  public defaultValue: Document = {
    attempts: 0,
    maxAttempts: 5,
  };

  /**
   * Cast data types before saving
   */
  protected casts: Casts = {
    code: "string",
    type: "string",
    target: "string",
    channel: "string",
    userId: "number",
    userType: "string",
    expiresAt: "date",
    usedAt: "date",
    attempts: "number",
    maxAttempts: "number",
    metadata: "object",
  };

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
    return this.save({
      usedAt: new Date(),
    });
  }

  /**
   * Increment failed attempt
   */
  public async incrementAttempt(): Promise<this> {
    return this.save({
      attempts: this.get("attempts") + 1,
    });
  }
}
