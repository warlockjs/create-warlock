import type { Request, Response } from "@warlock.js/core";
import type { User } from "app/users/models/user";

export default function myProfile(request: Request<User>, response: Response) {
  const currentUser = request.user;

  return response.success({
    user: currentUser,
  });
}
