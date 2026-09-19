import {
  FileCacheDriver,
  MemoryCacheDriver,
  MemoryExtendedCacheDriver,
  RedisCacheDriver,
  type CacheConfigurations,
} from "@warlock.js/cache";
import { DatabaseCacheDriver, env } from "@warlock.js/core";

/**
 * Namespace every cache key by this app, fixed at boot.
 *
 * This used to derive the prefix from `request.originDomain` / the `domain`
 * header / `?domain=` input. That broke two ways at once: a browser GET has
 * no `Origin` while a CSRF-protected POST does, so the two resolved to
 * different prefixes and a write could never invalidate what a read had
 * cached — repository caches and page-cache tags went silently stale. Worse,
 * none of those three inputs are server-validated, so any visitor could pick
 * `?domain=anything` and grow the store under an arbitrary namespace forever.
 *
 * A cache prefix has to come from something the app decides, not something
 * a request carries.
 */
const globalPrefix = () => env("APP_NAME", "store");

/**
 * Genuine multi-tenancy (one deployment, many tenants, isolated caches) needs
 * a tenant id the app has already validated server-side — e.g. set on
 * `request.locals.tenant` by the app's own tenant middleware after resolving
 * the host against its tenants table — never the raw `Origin`/`Host`, a
 * header, or query input, none of which the framework trusts.
 *
 * const globalPrefix = () => {
 *   const { request } = useRequestStore();
 *   const tenant = request?.locals.tenant; // set by app tenant middleware, already validated
 *   return tenant ? `${env("APP_NAME", "store")}.${tenant}` : env("APP_NAME", "store");
 * };
 */

const cacheConfigurations: CacheConfigurations<"database"> = {
  // Driven by CACHE_DRIVER so the shipped .env (`memory`) actually wins.
  // Hardcoding "redis" made a `--no-db` scaffold hang forever retrying a
  // Redis connection that was never going to exist.
  default: env("CACHE_DRIVER") || "redis",
  drivers: {
    file: FileCacheDriver,
    memory: MemoryCacheDriver,
    redis: RedisCacheDriver,
    memoryExtended: MemoryExtendedCacheDriver,
    database: DatabaseCacheDriver,
  },
  options: {
    redis: {
      host: env("REDIS_HOST"),
      port: env("REDIS_PORT"),
      url: env("REDIS_URL"),
      globalPrefix,
    },
    memory: {
      globalPrefix,
      ttl: 3 * 60 * 60, // 3 hours
    },
    memoryExtended: {
      globalPrefix,
      ttl: 30 * 60, // 30 minutes
    },
  },
};

export default cacheConfigurations;
