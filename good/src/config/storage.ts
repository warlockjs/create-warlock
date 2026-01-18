import { type StorageConfigurations, storageConfigurations, uploadsPath, env } from "@warlock.js/core";

const storageOptions: StorageConfigurations = {
  default: "local",
  drivers: {
    local: storageConfigurations.local({
      root: uploadsPath(),
      urlPrefix: "/uploads",
    }),
    aws: storageConfigurations.aws({
      accessKeyId: env("AWS_ACCESS_KEY_ID"),
      secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
      region: env("AWS_REGION"),
      bucket: env("AWS_BUCKET"),
    }),
    r2: storageConfigurations.r2({
      bucket: env("R2_BUCKET"),
      endpoint: env("R2_ENDPOINT"),
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      accountId: env("R2_ACCOUNT_ID"),
      region: env("R2_REGION", "auto"),
      publicDomain: env("R2_BASE_URL"),
      prefix: "warlock.js",
    }),
  },
};

export default storageOptions;
