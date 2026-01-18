import { v, type Infer, type Request } from "@warlock.js/core";

export const resetPasswordSchema = v.object({
  email: v.string().email().required(),
  code: v.string().required(),
  newPassword: v.string().min(8).required(),
});

export type ResetPasswordSchema = Infer<typeof resetPasswordSchema>;

export type ResetPasswordRequest = Request<undefined, ResetPasswordSchema>;
