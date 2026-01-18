import { router } from "@warlock.js/core";
import { guarded } from "app/utils/router";
import { forgotPassword } from "./controllers/forgot-password.controller";
import { login } from "./controllers/login.controller";
import { logoutAll } from "./controllers/logout-all.controller";
import { logout } from "./controllers/logout.controller";
import { me } from "./controllers/me.controller";
import { refreshToken } from "./controllers/refresh-token.controller";
import { resetPasswordController } from "./controllers/reset-password.controller";

// Auth routes
router.prefix("/auth", () => {
  router.post("/login", login);
  router.post("/refresh-token", refreshToken);
  router.post("/forgot-password", forgotPassword);
  router.post("/reset-password", resetPasswordController);
  guarded(() => {
    router.post("/logout", logout);
    router.post("/logout-all", logoutAll);
    router.get("/me", me);
  });
});
