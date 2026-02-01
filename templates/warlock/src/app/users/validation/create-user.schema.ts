import { v, type Infer } from "@warlock.js/core";
import { User } from "../models/user";

export const createUserSchema = v.object({
  name: v.string().required(),
  email: v.email().required().unique(User),
  password: v.string().min(6),
  image: v.file().image().required().maxSize({ unit: "MB", size: 1.5 }),
});

export type CreateUserSchema = Infer<typeof createUserSchema>;
