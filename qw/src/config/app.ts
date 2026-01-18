import { env } from "@warlock.js/core";
import type { AppConfigurations } from "@warlock.js/core";

const appConfigurations: AppConfigurations = {
  appName: env("APP_NAME", "Mongez"),
  timezone: env("TIMEZONE", "UTC"),
  baseUrl: env("BASE_URL", "http://localhost:3000"),
  localeCode: env("LOCALE_CODE", "en"),
  localeCodes: ["en", "ar"],
};

export default appConfigurations;
