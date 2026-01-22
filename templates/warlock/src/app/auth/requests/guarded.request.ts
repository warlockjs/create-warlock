import type { Request } from "@warlock.js/core";
import type { User } from "app/users/models/user";

export type GuardedRequest<RequestPayload = unknown> = Request<RequestPayload> & {
  user: User;
};
