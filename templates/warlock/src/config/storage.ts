import { env } from "@mongez/dotenv";
import { type StorageConfigurations, uploadsPath } from "@warlock.js/core";

const storageOptions: StorageConfigurations = {
  default: "rafaat",
  drivers: {
    rafaat: {
      driver: "local",
      root: uploadsPath(),
    },
    aws: {
      driver: "s3",
      accessKeyId: env("AWS_ACCESS_KEY_ID"),
      secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
      region: env("AWS_REGION"),
      bucket: env("AWS_BUCKET"),
    },
  },
};

export default storageOptions;
