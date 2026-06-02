import type { Request, RequestHandler } from "@warlock.js/core";
import type { User } from "app/users/models/user";

export type GuardedRequest<RequestPayload = unknown> =
  Request<RequestPayload> & {
    user: User;
  };

export type GuardedRequestHandler<RequestPayload = unknown> = RequestHandler<
  GuardedRequest<RequestPayload>
>;
