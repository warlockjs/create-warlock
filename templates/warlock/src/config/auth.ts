import { env } from "@mongez/dotenv";
import type { AuthConfigurations } from "@warlock.js/auth";
import { Guest } from "@warlock.js/auth";
import { User } from "app/users/models/user";

const authConfigurations: AuthConfigurations = {
  userType: {
    guest: Guest,
    user: User,
  },
  jwt: {
    secret: env("JWT_SECRET"),
  },
};

export default authConfigurations;
