import { env } from "@mongez/dotenv";
import { NO_EXPIRATION, type AuthConfigurations } from "@warlock.js/auth";
import { User } from "app/users/models/user";

const authConfigurations: AuthConfigurations = {
  userType: {
    user: User,
  },
  jwt: {
    secret: env("JWT_SECRET"),
    expiresIn: NO_EXPIRATION,
    refresh: {
      expiresIn: "7d",
      enabled: false,
      secret: env("JWT_REFRESH_SECRET"),
    },
  },
};

export default authConfigurations;
