import { authMiddleware } from "@warlock.js/auth";
import { router } from "@warlock.js/core";

export function publicRoutes(callback: () => void) {
  router.group(
    {
      prefix: "/",
    },
    callback,
  );
}

/**
 * Require an authenticated user of the default `user` type. This scaffold
 * registers only that one type (see `src/config/auth.ts`), so in a fresh
 * project this effectively guards a block for any authenticated user.
 *
 * To restrict a group to a specific user type — for example an admin-only
 * area — register that type in `src/config/auth.ts` and pass it explicitly
 * to `authMiddleware`:
 *
 * @example
 * router.group({ prefix: "/admin", middleware: [authMiddleware(["admin"])] }, callback);
 */
export function guarded(callback: () => void) {
  router.group(
    {
      middleware: [authMiddleware("user")],
    },
    callback,
  );
}
