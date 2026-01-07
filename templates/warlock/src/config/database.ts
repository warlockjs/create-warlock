import { env } from "@mongez/dotenv";
import type {
  ConnectionOptions,
  MongoClientOptions,
  MongoDriverOptions,
} from "@warlock.js/cascade";

const databaseConfigurations: ConnectionOptions<MongoDriverOptions, MongoClientOptions> = {
  driver: "mongodb",
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

  defaultDeleteStrategy: "trash",

  clientOptions: {
    replicaSet: env("DB_REPLICA_SET"),
  },

  modelOptions: {
    randomIncrement: true,
    initialId: 1,
  },
};

export default databaseConfigurations;
