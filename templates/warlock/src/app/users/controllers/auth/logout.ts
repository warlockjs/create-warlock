import type { Request, Response } from "@warlock.js/core";
import type { User } from "app/users/models/user";

export default function logout(request: Request<User>, response: Response) {
  const user = request.user;

  user.removeAccessToken(request.accessToken);

  return response.success();
}
