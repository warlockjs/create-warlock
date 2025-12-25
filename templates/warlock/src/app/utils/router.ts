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

export function guardedAdmin(callback: () => void) {
  router.group(
    {
      prefix: "/admin",
      middleware: [authMiddleware()],
    },
    callback,
  );
}

export function guarded(callback: () => void) {
  router.group(
    {
      middleware: [authMiddleware()],
    },
    callback,
  );
}
