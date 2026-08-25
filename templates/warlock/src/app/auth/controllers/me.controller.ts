import { type RequestHandler } from "@warlock.js/core";

/**
 * Get current user controller
 * GET /auth/me
 */
export const meController: RequestHandler = async ({ request, response }) => {
  return response.success({
    user: request.user,
  });
};

meController.description = "Get Current User";
