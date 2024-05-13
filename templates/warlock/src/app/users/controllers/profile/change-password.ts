import type { Request, Response } from "@warlock.js/core";
import type { User } from "app/users/models/user";

export default async function changePassword(
  request: Request,
  response: Response,
) {
  const user = request.user;

  await user.save({
    password: request.input("password"),
  });

  return response.success();
}

changePassword.validation = {
  rules: {
    currentPassword: ["required"],
    password: ["required", "minLength:8", "confirmed"],
  },
  validate: (request: Request<User>, response: Response) => {
    const user = request.user;

    if (!user.confirmPassword(request.input("currentPassword"))) {
      return response.badRequest({
        error: "Invalid current password",
      });
    }
  },
};
