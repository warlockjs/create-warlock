import type { User } from "app/users/models/user";

/**
 * Login user and return user data with access token
 */
export async function loginUserService(user: User): Promise<{
  user: any;
  accessToken: string;
  userType: string;
}> {
  const accessToken = await user.generateAccessToken();
  
  return {
    user: await user.toJSON(),
    accessToken: accessToken,
    userType: user.userType,
  };
}
