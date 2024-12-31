import {
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";
import { User } from "app/users/models/user";

export const loginRequest: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  const user = await User.attempt(request.only(["email", "password"]));

  if (!user) {
    return response.badRequest({
      message: "Invalid credentials",
    });
  }

  // generate a JWT token for the logged-in user
  const token = await user.generateAccessToken();

  return response.success({
    message: "User logged in successfully",
    user,
    accessToken: token,
  });
};
