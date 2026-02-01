import { v, type Infer } from "@warlock.js/core";

export const loginSchema = v.object({
  email: v.email().required(),
  password: v.string().required(),
});

export type LoginSchema = Infer<typeof loginSchema>;
