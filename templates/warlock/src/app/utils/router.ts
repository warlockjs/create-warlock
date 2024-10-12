import { authMiddleware } from "@warlock.js/auth";
import {
  router,
  useRequestStore,
  type Middleware,
  type RouterGroupCallback,
} from "@warlock.js/core";

export const adminPath = (path: string) => `/admin${path}`;

/**
 * Check if the current request is for admin
 */
export const isAdminRequest = () => {
  const { request } = useRequestStore();

  return request.path.includes("/admin");
};

/**
 * Add routes Group
 */
const adminRoutes = (callback: RouterGroupCallback) => {
  return router.group(
    {
      prefix: "/admin",
      name: "admin",
    },
    callback,
  );
};

/**
 * Register guarded routes that requires user to be logged in to access them.
 */
export const guarded = (
  callback: RouterGroupCallback,
  moreMiddlewares: Middleware[] = [],
) => {
  return router.group(
    {
      name: "guarded.user",
      middleware: [authMiddleware("user"), ...moreMiddlewares],
    },
    callback,
  );
};

/**
 * Only guests can access these routes.
 */
export const guardedGuest = (callback: RouterGroupCallback) => {
  return router.group(
    {
      name: "guarded.guest",
      middleware: [authMiddleware()],
    },
    callback,
  );
};

/**
 * Guarded guest routes for admin
 */
export const guardedGuestAdmin = (callback: RouterGroupCallback) => {
  return adminRoutes(() => {
    router.group(
      {
        name: "guarded.guest",
        middleware: [authMiddleware()],
      },
      callback,
    );
  });
};

/**
 * Only admin can access these routes.
 */
export const guardedAdmin = (callback: RouterGroupCallback) => {
  return adminRoutes(() => {
    router.group(
      {
        name: "guarded.user",
        middleware: [authMiddleware("user")],
      },
      callback,
    );
  });
};

/**
 * Public routes that doesn't require user to be logged in to access them.
 * Just requires an access token.
 */
export const publicRoutes = (callback: RouterGroupCallback) => {
  return router.group(
    {
      name: "public",
      middleware: [authMiddleware()],
    },
    callback,
  );
};
