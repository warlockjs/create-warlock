import { t, type Request, type RequestHandler, type Response } from "@warlock.js/core";
import { logoutAllService } from "../services/auth.service";

/**
 * Logout from all devices controller
 * POST /auth/logout-all
 */
export const logoutAll: RequestHandler = async (request: Request, response: Response) => {
  await logoutAllService(request.user);

  return response.success({
    message: t("auth.loggedOutAll"),
  });
};

logoutAll.description = "Logout from all devices";
