import {
  v,
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";
import { refreshTokensService } from "../services/auth.service";

/**
 * Refresh token controller
 * POST /auth/refresh-token
 */
export const refreshTokenController: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  const token = request.input("refreshToken");

  const result = await refreshTokensService(token, {
    userAgent: request.userAgent,
    ip: request.ip,
  });

  return response.success(result);
};

refreshTokenController.description = "Refresh Access Token";

refreshTokenController.validation = {
  schema: v.object({
    refreshToken: v.string().required(),
  }),
};
