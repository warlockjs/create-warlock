import { env } from "@mongez/dotenv";
import type { CacheConfigurations } from "@warlock.js/cache";
import {
  FileCacheDriver,
  MemoryCacheDriver,
  MemoryExtendedCacheDriver,
  RedisCacheDriver,
} from "@warlock.js/cache";

const globalPrefix = () => {
  return env("CACHE_PREFIX", env("APP_NAME", "warlock"));
};

const cacheConfigurations: CacheConfigurations = {
  drivers: {
    file: FileCacheDriver,
    memory: MemoryCacheDriver,
    redis: RedisCacheDriver,
    memoryExtended: MemoryExtendedCacheDriver,
  },
  default: env("CACHE_DRIVER", "memoryExtended"),
  options: {
    memory: {
      globalPrefix,
      ttl: 3600 * 3, // 3 hours
    },
    memoryExtended: {
      globalPrefix,
      ttl: 3600 * 3, // 3 hours
    },
    redis: {
      host: env("REDIS_HOST"),
      port: env("REDIS_PORT"),
      url: env("REDIS_URL"),
      globalPrefix,
    },
  },
};

export default cacheConfigurations;
