import { UniqueRule, type Request, type Response } from "@warlock.js/core";
import { User } from "app/users/models/user";

export default async function verifyForgetPasswordCode(
  request: Request,
  response: Response,
) {
  // your code here

  return response.success({});
}

verifyForgetPasswordCode.validation = {
  rules: {
    email: ["required", "email", new UniqueRule(User)],
    code: ["required", "int", "length:6"],
  },
};
