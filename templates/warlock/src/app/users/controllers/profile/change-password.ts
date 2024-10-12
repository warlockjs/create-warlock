import { v, type Request, type Response } from "@warlock.js/core";
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
  schema: v.object({
    password: v.string().minLength(8).required(),
    confirmPassword: v.string().required().matches("password"),
  }),
  validate: (request: Request<User>, response: Response) => {
    const user = request.user;

    if (!user.confirmPassword(request.input("currentPassword"))) {
      return response.badRequest({
        error: "Invalid current password",
      });
    }
  },
};
