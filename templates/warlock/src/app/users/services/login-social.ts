import type { Request, Response } from "@warlock.js/core";

export default async function loginSocial(
  request: Request,
  response: Response,
) {
  const user = request.user;

  const auth = await user.generateAccessToken();

  user.save({
    lastLogin: new Date(),
  });

  return response.success({
    user: {
      ...(await user.toJSON()),
      accessToken: auth,
      userType: user.userType,
    },
  });
}
