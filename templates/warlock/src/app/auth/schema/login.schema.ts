import { v, type Infer } from "@warlock.js/seal";

export const loginSchema = v.object({
  email: v.email(),
  password: v.string(),
});

export type LoginSchema = Infer<typeof loginSchema>;
