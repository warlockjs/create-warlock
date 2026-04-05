import type { AccessTokenOutput, Auth } from "@warlock.js/auth";
import { authService, type DeviceInfo, type TokenPair } from "@warlock.js/auth";
import { t, UnAuthorizedError } from "@warlock.js/core";
import { User } from "app/users/models/user/user.model";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResult =
  | {
      user: User;
      tokens: TokenPair;
    }
  | null
  | {
      user: User;
      accessToken: AccessTokenOutput;
    };

/**
 * Login with email and password
 */
export async function loginService(
  credentials: LoginCredentials,
  deviceInfo?: DeviceInfo,
): Promise<LoginResult> {
  const result = await authService.login(User, credentials, deviceInfo);

  if (!result) {
    throw new UnAuthorizedError(t("auth.invalidCredentials"));
  }

  return result;
}

/**
 * Logout user
 */
export async function logoutService(user: Auth): Promise<void> {
  return authService.logout(user);
}

/**
 * Logout from all devices
 */
export async function logoutAllService(user: Auth): Promise<void> {
  return authService.revokeAllTokens(user);
}

/**
 * Refresh tokens
 */
export async function refreshTokensService(
  refreshToken: string,
  deviceInfo?: DeviceInfo,
): Promise<TokenPair> {
  const result = await authService.refreshTokens(refreshToken, deviceInfo);

  if (!result) {
    throw new UnAuthorizedError(t("auth.invalidRefreshToken"));
  }

  return result;
}
