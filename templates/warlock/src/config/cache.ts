import {
  FileCacheDriver,
  MemoryCacheDriver,
  MemoryExtendedCacheDriver,
  RedisCacheDriver,
  type CacheConfigurations,
} from "@warlock.js/cache";
import { env, DatabaseCacheDriver, useRequestStore } from "@warlock.js/core";

const globalPrefix = () => {
  const { request } = useRequestStore();

  let cachePrefix = "store";

  if (!request) return cachePrefix;

  if (request.client) {
    cachePrefix = `${cachePrefix}.${request.client.get("username")}`;

    return cachePrefix;
  }

  const domain = request.originDomain || request.header("domain") || request.input("domain");

  if (!domain) return cachePrefix;

  cachePrefix = `${cachePrefix}.${domain}`;

  return cachePrefix;
};

const cacheConfigurations: CacheConfigurations<"database"> = {
  default: "memoryExtended",
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
