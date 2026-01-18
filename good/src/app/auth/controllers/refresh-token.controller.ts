import { t, v, type Request, type RequestHandler, type Response } from "@warlock.js/core";
import { refreshTokensService } from "../services/auth.service";

/**
 * Refresh token controller
 * POST /auth/refresh-token
 */
export const refreshToken: RequestHandler = async (request: Request, response: Response) => {
  const token = request.input("refreshToken");

  const result = await refreshTokensService(token, {
    userAgent: request.userAgent,
    ip: request.ip,
  });

  if (!result) {
    return response.unauthorized({
      error: t("auth.invalidRefreshToken"),
    });
  }

  return response.success(result);
};

refreshToken.description = "Refresh Access Token";

refreshToken.validation = {
  schema: v.object({
    refreshToken: v.string().required(),
  }),
};
