import { v, type Infer } from "@warlock.js/core";

export const activateAccountSchema = v.object({
  email: v.string().email().required(),
  code: v.string().required(),
});

export type ActivateAccountData = Infer<typeof activateAccountSchema>;
