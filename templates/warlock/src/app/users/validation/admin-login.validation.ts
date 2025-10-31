import { v, type Infer } from "@warlock.js/core";

export const adminLoginSchema = v.object({
  email: v.string().email().required(),
  password: v.string().required(),
});

export type AdminLoginData = Infer<typeof adminLoginSchema>;
