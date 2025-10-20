/**
 * Config Type Mappings
 *
 * This file defines the return types for config.get() calls.
 * Framework configs are pre-typed for you - just add your custom ones!
 *
 * Usage:
 *   const db = config.get("database");
 *   db.host // ✅ Autocomplete works!
 */

import type { AuthConfigurations } from "@warlock.js/auth";
import type { CacheConfigurations } from "@warlock.js/cache";
import type { DatabaseConfigurations } from "@warlock.js/cascade";
import type {
  AppConfigurations,
  HttpConfigurations,
  LogConfigurations,
  MailConfigurations,
  OutputConfigurations,
  ValidationConfigurations,
} from "@warlock.js/core";
import type { PostmanConfigurations } from "@warlock.js/postman";

/**
 * Config type map - maps config keys to their return types
 *
 * Framework configs are pre-defined below.
 * Add your custom config types here!
 *
 * Example:
 *   export interface ConfigTypeMap {
 *     // ... framework types
 *     sockets: {
 *       port: number;
 *       host: string;
 *       enabled: boolean;
 *     };
 *   }
 */
export interface ConfigTypeMap {
  // Framework configs (pre-typed for autocomplete!)
  app: AppConfigurations;
  auth: AuthConfigurations;
  cache: CacheConfigurations;
  database: DatabaseConfigurations;
  http: HttpConfigurations;
  log: LogConfigurations;
  mail: MailConfigurations;
  output: OutputConfigurations;
  validation: ValidationConfigurations;
  postman: PostmanConfigurations;

  // Add your custom config types below:
  // sockets: MySocketsConfig;
  // stripe: StripeConfig;
}
