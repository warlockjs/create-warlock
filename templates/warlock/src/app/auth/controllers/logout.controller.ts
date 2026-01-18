import {
  t,
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";
import { logoutService } from "../services/auth.service";

/**
 * Logout controller
 * POST /auth/logout
 */
export const logout: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  await logoutService(request.user);

  return response.success({
    message: t("auth.loggedOut"),
  });
};

logout.description = "User Logout";
