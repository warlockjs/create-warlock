import {
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";

/**
 * Get current user controller
 * GET /auth/me
 */
export const meController: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  return response.success({
    user: request.user,
  });
};

meController.description = "Get Current User";
