import type { GuardedRequestHandler } from "app/auth/requests/guarded.request";

/**
 * Social login handler.
 *
 * Despite living under `services/`, this is a route handler: it consumes the
 * request and returns a response. It is typed as a `GuardedRequestHandler` so
 * it can be wired straight into a route, and so `request.user` resolves to the
 * app's `User` model rather than core's optional `RequestUser`.
 */
const loginSocial: GuardedRequestHandler = async ({ request, response }) => {
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
};

export default loginSocial;
