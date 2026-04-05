import { router } from "@warlock.js/core";
import { guarded } from "app/shared/utils/router";
import { forgotPasswordController } from "./controllers/forgot-password.controller";
import { loginController } from "./controllers/login.controller";
import { logoutAllController } from "./controllers/logout-all.controller";
import { logoutController } from "./controllers/logout.controller";
import { meController } from "./controllers/me.controller";
import { refreshTokenController } from "./controllers/refresh-token.controller";
import { resetPasswordController } from "./controllers/reset-password.controller";

// Auth routes
router.prefix("/auth", () => {
  router.post("/login", loginController);
  router.post("/refresh-token", refreshTokenController);
  router.post("/forgot-password", forgotPasswordController);
  router.post("/reset-password", resetPasswordController);
  guarded(() => {
    router.post("/logout", logoutController);
    router.post("/logout-all", logoutAllController);
    router.get("/me", meController);
  });
});
