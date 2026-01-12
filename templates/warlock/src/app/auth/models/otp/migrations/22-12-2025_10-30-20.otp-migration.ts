import { migrate } from "@warlock.js/cascade";
import { OTP } from "../otp.model";

export default migrate(OTP, {
  name: "otp",
  createdAt: "2025-12-22T10:30:20",
  up() {
    // Create table
    this.createTableIfNotExists();

    // Primary key
    this.id();

    // OTP fields
    this.string("code", 20);
    this.string("type", 50);
    this.string("target", 255);
    this.string("channel", 50);
    this.integer("userId");
    this.string("userType", 50);
    this.timestamp("expiresAt");
    this.timestamp("usedAt").nullable();
    this.integer("attempts").default(0);
    this.integer("maxAttempts").default(5);
    this.json("metadata").nullable();

    // Status
    this.boolean("isActive").default(true);

    // Embedded user references (JSONB)
    this.json("createdBy").nullable();
    this.json("updatedBy").nullable();
    this.json("deletedBy").nullable();

    // Timestamps
    this.timestamps();

    // Indexes for common queries
    this.index("code");
    this.index(["target", "type"]);
    this.index("expiresAt");
    this.index("userId");
  },
  down() {
    this.dropTableIfExists();
  },
});
