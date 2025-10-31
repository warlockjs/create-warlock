import { Random } from "@mongez/reinforcements";
import { UniqueRule, type Request, type Response } from "@warlock.js/core";
import { User } from "app/users/models/user";

export default async function createAccount(
  request: Request,
  response: Response,
) {
  User.create({
    ...request.validated(),
    activationCode: Random.int(100000, 999999),
  });

  return response.success();
}

createAccount.validation = {
  rules: {
    name: ["required", "minLength:2"],
    email: ["required", "email", new UniqueRule(User)],
    password: ["required", "minLength:8"],
  },
};
