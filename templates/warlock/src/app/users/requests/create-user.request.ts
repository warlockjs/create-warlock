import type { Request } from "@warlock.js/core";
import { type CreateUserSchema } from "../validation/create-user.schema";

export type CreateUserRequest = Request<CreateUserSchema>;
