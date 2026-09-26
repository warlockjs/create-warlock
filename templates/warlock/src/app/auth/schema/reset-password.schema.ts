import { v, type Infer } from "@warlock.js/seal";

export const resetPasswordSchema = v.object({
  email: v.string().email(),
  code: v.string(),
  newPassword: v.string().min(8),
});

export type ResetPasswordSchema = Infer<typeof resetPasswordSchema>;
