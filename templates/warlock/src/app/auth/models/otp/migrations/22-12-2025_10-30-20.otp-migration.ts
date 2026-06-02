import { bool, integer, json, Migration, string, timestamp } from "@warlock.js/cascade";
import { OTP } from "../otp.model";

export default Migration.create(
  OTP,
  {
    code: string(20).index(),
    type: string(50),
    target: string(255),
    channel: string(50),
    userId: integer().index(),
    userType: string(50),
    expiresAt: timestamp().index(),
    usedAt: timestamp().nullable(),
    attempts: integer(),
    maxAttempts: integer(),
    metadata: json().nullable(),
    isActive: bool(),
    createdBy: json().nullable(),
    updatedBy: json().nullable(),
    deletedBy: json().nullable(),
  },
  {
    index: [
      {
        columns: ["target", "type"],
      },
    ],
  },
);
