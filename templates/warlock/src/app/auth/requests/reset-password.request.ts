import type { Request } from "@warlock.js/core";
import { type ResetPasswordSchema } from "../validation/reset-password.schema";

export type ResetPasswordRequest = Request<ResetPasswordSchema>;
