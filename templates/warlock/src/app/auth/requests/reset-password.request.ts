import type { Request } from "@warlock.js/core";
import { type ResetPasswordSchema } from "../schema/reset-password.schema";

export type ResetPasswordRequest = Request<ResetPasswordSchema>;
