import { Random } from "@mongez/reinforcements";
import type { RequestHandler } from "@warlock.js/core";
import { v, type Request, type Response } from "@warlock.js/core";
import { User } from "app/users/models/user";

export const registerRequest: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  User.create({
    ...request.validated(),
    activationCode: Random.int(100000, 999999),
  });

  return response.success();
};

registerRequest.validation = {
  schema: v.object({
    name: v.string().minLength(2).required(),
    email: v.string().email().required().unique(User),
    password: v.string().minLength(8).required(),
  }),
};
