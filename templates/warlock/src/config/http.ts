import { env } from "@mongez/dotenv";
import type { HttpConfigurations } from "@warlock.js/core";

const httpConfigurations: HttpConfigurations = {
  port: env("HTTP_PORT", 3000),
  host: env("HTTP_HOST", "localhost"),
  log: true,
  fileUploadLimit: 20 * 1024 * 1024, // 20MB
  rateLimit: {
    max: 260, // max requests per duration (i.e minute)
    duration: 60 * 1000, // 1 minute
  },
  cors: {
    // allowed origins
    // origin: ["http://localhost"],
    origin: "*",
    // allowed methods
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  },
};

export default httpConfigurations;
