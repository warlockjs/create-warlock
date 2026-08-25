import { t, type RequestHandler } from "@warlock.js/core";
import { logoutAllService } from "../services/auth.service";

/**
 * Logout from all devices controller
 * POST /auth/logout-all
 */
export const logoutAllController: RequestHandler = async ({ request, response }) => {
  await logoutAllService(request.user);

  return response.success({
    message: t("auth.loggedOutAll"),
  });
};

logoutAllController.description = "Logout from all devices";
