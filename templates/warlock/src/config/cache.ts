import {
  FileCacheDriver,
  MemoryCacheDriver,
  MemoryExtendedCacheDriver,
  RedisCacheDriver,
  type CacheConfigurations,
} from "@warlock.js/cache";
import { DatabaseCacheDriver, env, useRequestStore } from "@warlock.js/core";

/**
 * Namespace every cache key by the caller's domain, so two tenants hitting the
 * same app never read each other's cached values.
 *
 * This used to branch on `request.client` first. That property does not exist:
 * it survived from v4, where `Request` carried a `[key: string]: any` index
 * signature that made any property name compile. v5 removed the index signature
 * and the branch became a type error.
 *
 * It was deleted rather than renamed. The obvious "fix" — pointing it at
 * `request.locals.client` — compiles and is worse than the bug: nothing in the
 * framework populates `request.locals`, so the branch would be permanently
 * `undefined` and silently dead. `originDomain` below is real (it is derived
 * from the `Origin` header) and already covers the multi-tenant case, so the
 * scaffold prefixes on that and models nothing the framework does not provide.
 */
const globalPrefix = () => {
  const { request } = useRequestStore();

  let cachePrefix = "store";

  if (!request) return cachePrefix;

  const domain = request.originDomain || request.header("domain") || request.input("domain");

  if (!domain) return cachePrefix;

  cachePrefix = `${cachePrefix}.${domain}`;

  return cachePrefix;
};

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
