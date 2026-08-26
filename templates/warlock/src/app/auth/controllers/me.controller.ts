import { type GuardedRequestHandler } from "app/auth/requests/guarded.request";

/**
 * Get current user controller
 * GET /auth/me
 *
 * Guarded route. As a plain `RequestHandler` this compiled without complaint
 * while serializing `RequestUser | undefined` — i.e. the empty interface `{}` —
 * so the response body was typed as nothing at all and no error was raised.
 * `GuardedRequestHandler` types it as the app's `User` model.
 */
export const meController: GuardedRequestHandler = async ({ request, response }) => {
  return response.success({
    user: request.user,
  });
};

meController.description = "Get Current User";
