import { t } from "@warlock.js/core";
import { type GuardedRequestHandler } from "app/auth/requests/guarded.request";
import { logoutAllService } from "../services/auth.service";

/**
 * Logout from all devices controller
 * POST /auth/logout-all
 *
 * Guarded route — see the note on `logoutController`.
 */
export const logoutAllController: GuardedRequestHandler = async ({ request, response }) => {
  await logoutAllService(request.user);

  return response.success({
    message: t("auth.loggedOutAll"),
  });
};

logoutAllController.description = "Logout from all devices";
