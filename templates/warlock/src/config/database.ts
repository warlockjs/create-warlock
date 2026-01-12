import { env } from "@mongez/dotenv";
import type {
  ConnectionOptions,
  MongoClientOptions,
  MongoDriverOptions,
} from "@warlock.js/cascade";

const databaseConfigurations: ConnectionOptions<MongoDriverOptions, MongoClientOptions> = {
  driver: "postgres",
  name: "default",
  database: env("DB_NAME"),
  host: env("DB_HOST", "localhost"),
  port: env("DB_PORT", 27017),
  username: env("DB_USERNAME"),
  password: env("DB_PASSWORD"),
  authSource: env("DB_AUTH"),
  uri: env("DB_URL"),

  driverOptions: {
    autoGenerateId: true,
    counterCollection: "counters",
  },

  defaultDeleteStrategy: "permanent",

  clientOptions: {
    replicaSet: env("DB_REPLICA_SET"),
  },

  // ============================================================================
  // Model Defaults Configuration
  // ============================================================================
  // These settings override driver defaults and apply to all models.
  // Individual models can override these by setting static properties.
  //
  // Configuration hierarchy (highest to lowest):
  // 1. Model static property (e.g., User.createdAtColumn = "creation_date")
  // 2. modelOptions (below) - Database-wide overrides
  // 3. Driver defaults (PostgreSQL: snake_case, MongoDB: camelCase)
  // 4. Framework defaults
  // ============================================================================
  modelOptions: {
    // ID Generation (for MongoDB)
    randomIncrement: true,
    initialId: 1,

    // Timestamps - PostgreSQL driver already defaults to snake_case
    // (created_at, updated_at) so these are optional unless overriding
    timestamps: true,
    // createdAtColumn: "created_at", // Already driver default
    // updatedAtColumn: "updated_at", // Already driver default

    // Deletion Strategy
    // deleteStrategy: "soft", // Uncomment to enable soft deletes globally
    // deletedAtColumn: "deleted_at", // Already driver default

    // Validation
    strictMode: "strip",

    // Naming Convention
    // namingConvention: "snake_case", // Already driver default for PostgreSQL
  },
};

export default databaseConfigurations;
