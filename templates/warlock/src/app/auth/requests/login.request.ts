import type { Request } from "@warlock.js/core";
import { type LoginSchema } from "../validation/login.schema";

export type LoginRequest = Request<LoginSchema>;
