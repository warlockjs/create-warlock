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

  // `save()` takes WriterOptions — the fields to write go under `merge`, typed
  // against `userSchema`. Passing `{ lastLogin }` at the top level was not a
  // write at all: it was an unknown option, and the value went nowhere.
  // Awaited, so the write is not a floating promise racing the response.
  await user.save({
    merge: {
      lastLogin: new Date(),
    },
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
