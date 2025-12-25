import type { Auth } from "@warlock.js/auth";
import { authService, type DeviceInfo, type TokenPair } from "@warlock.js/auth";
import { User } from "app/users/models/user";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResult = {
  user: Auth;
  tokens: TokenPair;
};

/**
 * Login with email and password
 */
export async function loginService(
  credentials: LoginCredentials,
  deviceInfo?: DeviceInfo,
): Promise<LoginResult | null> {
  return authService.login(User, credentials, deviceInfo);
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
): Promise<TokenPair | null> {
  return authService.refreshTokens(refreshToken, deviceInfo);
}
