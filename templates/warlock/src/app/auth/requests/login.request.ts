import type { Request } from "@warlock.js/core";
import { type LoginSchema } from "../schema/login.schema";

export type LoginRequest = Request<LoginSchema>;
