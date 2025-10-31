import { v, type Infer } from "@warlock.js/core";

export const loginSchema = v.object({
  email: v.string().email().required(),
  password: v.string().required(),
});

export type LoginData = Infer<typeof loginSchema>;
