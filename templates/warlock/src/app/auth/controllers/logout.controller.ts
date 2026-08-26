import { t } from "@warlock.js/core";
import { type GuardedRequestHandler } from "app/auth/requests/guarded.request";
import { logoutService } from "../services/auth.service";

/**
 * Logout controller
 * POST /auth/logout
 *
 * Typed as `GuardedRequestHandler` because the route sits inside `guarded()`
 * (see `../routes.ts`). A plain `RequestHandler` types `request.user` as
 * `RequestUser | undefined`, which is not assignable to `logoutService`.
 */
export const logoutController: GuardedRequestHandler = async ({ request, response }) => {
  await logoutService(request.user);

  return response.success({
    message: t("auth.loggedOut"),
  });
};

logoutController.description = "User Logout";
