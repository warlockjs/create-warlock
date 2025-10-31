import { v, type Infer } from "@warlock.js/core";

export const createAccountSchema = v.object({
  name: v.string().minLength(2).required(),
  email: v.string().email().required(),
  password: v.string().minLength(8).required().strongPassword(),
  confirmPassword: v.string().minLength(8).required().saveAs("password"),
});

export type CreateAccountData = Infer<typeof createAccountSchema>;
