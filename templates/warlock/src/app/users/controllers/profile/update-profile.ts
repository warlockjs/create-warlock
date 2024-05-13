import type { Request, Response } from "@warlock.js/core";
import { UniqueRule } from "@warlock.js/core";
import { User } from "app/users/models/user";

export default async function updateProfile(
  request: Request<User>,
  response: Response,
) {
  await request.user.save(request.validated());

  return response.success();
}

updateProfile.validation = {
  rules: {
    name: ["required", "minLength:2"],
    gender: ["in:male,female"],
    phoneNumber: ["required", new UniqueRule(User).exceptCurrentUser()],
    email: [
      "required",
      "email",
      new UniqueRule(User).insensitive().exceptCurrentUser(),
    ],
  },
};
