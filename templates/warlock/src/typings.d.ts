/**
 * Project-wide type augmentations.
 *
 * This is where the app teaches the framework about ITS OWN types. Warlock's
 * `Request` class no longer carries a `[key: string]: any` index signature —
 * attaching arbitrary properties used to compile silently and hide real bugs
 * behind `any` — so the sanctioned way to extend a request is to merge extra
 * members into the framework's own interfaces from here.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE HAS `export {}` AT THE BOTTOM
 * ---------------------------------------------------------------------------
 * `declare module "x" { ... }` means two completely different things depending
 * on whether the enclosing file is a module:
 *
 * - In a SCRIPT file (no top-level `import`/`export`), it declares an AMBIENT
 *   module — it REPLACES the real typings of `@warlock.js/core` with whatever
 *   is inside the braces, and every existing export vanishes.
 * - In a MODULE file (has a top-level `import`/`export`), it is a MODULE
 *   AUGMENTATION — it merges into the real typings, which is what we want.
 *
 * The trailing `export {}` is what makes this file a module. Do not delete it,
 * and do not "clean it up" as an unused statement.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE ARE `interface` AND NOT `type`
 * ---------------------------------------------------------------------------
 * This project's standard is "prefer `type` over `interface`". These
 * declarations are a NAMED EXCEPTION to that standard: declaration merging is
 * an interface-only feature. A `type RequestUser = { ... }` here does not merge
 * with the framework's declaration — it is a duplicate-identifier error. Every
 * augmentation in this file must stay an `interface`.
 */

declare module "@warlock.js/core" {
  /**
   * Arbitrary per-request data — `request.locals`.
   *
   * Populate it from a middleware and read it downstream in the same request.
   *
   * NOTE: the framework itself never writes to `request.locals`; it only
   * initializes it to `{}` once per request. Anything you declare here is a
   * promise YOU have to keep in a middleware, otherwise the property typechecks
   * and is `undefined` forever at runtime. Declare a field here only once
   * something actually assigns it.
   *
   * @example
   * ```ts
   * interface RequestLocals {
   *   // set by a middleware that resolves the tenant from the request host
   *   tenant?: Tenant;
   * }
   * ```
   */
  interface RequestLocals {}

  /**
   * The authenticated user — `request.user`.
   *
   * The auth middleware assigns the resolved user model here. Declaring its
   * shape gives unguarded handlers (ones that may or may not have a user) a
   * real type instead of `{}`.
   *
   * This does NOT make `request.user` non-optional: the framework declares it
   * as `user?: RequestUser`, and augmentation can add members but cannot remove
   * the `?`. For routes that are actually behind the auth guard, type the
   * handler as `GuardedRequestHandler` (see
   * `src/app/auth/requests/guarded.request.ts`) — that narrows `request.user`
   * to the app's `User` model AND drops the `| undefined`.
   *
   * @example
   * ```ts
   * interface RequestUser {
   *   id: string | number;
   *   email: string;
   * }
   * ```
   */
  interface RequestUser {}
}

export {};
