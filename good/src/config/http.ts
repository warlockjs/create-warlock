import { env } from "@warlock.js/core";
import type { HttpConfigurations } from "@warlock.js/core";

const httpConfigurations: HttpConfigurations = {
  port: env("HTTP_PORT", 3000),
  host: env("HTTP_HOST", "localhost"),
  log: true,
  fileUploadLimit: 12 * 1024 * 1024 * 1024,
  rateLimit: {
    max: 260,
    duration: 60 * 1000, // 1 minute
  },
  cors: {
    // allowed origins
    //   origin: ["127.0.0.1:5173", "localhost:5173"],
    // origin: ["http://127.0.0.1:5173"],
    origin: "*",
    // allowed methods
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  },
};

export default httpConfigurations;
