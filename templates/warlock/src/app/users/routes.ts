import { router } from "@warlock.js/core";
import {
  guarded,
  guardedAdmin,
  guardedGuest,
  guardedGuestAdmin,
} from "app/utils/router";
import activateAccountController from "./controllers/auth/activate-account.controller";
import adminLoginController from "./controllers/auth/admin-login.controller";
import { createAccountController } from "./controllers/auth/create-account.controller";
import forgetPassword from "./controllers/auth/forget-password.controller";
import { loginController } from "./controllers/auth/login.controller";
import logout from "./controllers/auth/logout.controller";
import resendActivationCode from "./controllers/auth/resend-activation-code.controller";
import resetPassword from "./controllers/auth/reset-password.controller";
import verifyForgetPasswordCode from "./controllers/auth/verify-forget-password-code.controller";
import changePassword from "./controllers/profile/change-password.controller";
import myProfile from "./controllers/profile/my-profile.controller";
import updateProfile from "./controllers/profile/update-profile.controller";
import { restfulUsers } from "./controllers/users.restful";

// admin auth
guardedGuestAdmin(() => {
  router.post("/login", adminLoginController);
  router.post("/forget-password", forgetPassword);
  router.post("/reset-password", resetPassword);
});

guardedAdmin(() => {
  // REST API for users
  router.restfulResource("/users", restfulUsers);
});

// user auth
guardedGuest(() => {
  router.post("/login", loginController);
  router.post("/register", createAccountController);
  router.post("/register/verify", activateAccountController);
  router.post("/resend-activation-code", resendActivationCode);
  router.post("/forget-password", forgetPassword);
  router.post("/forget-password/verify-code", verifyForgetPasswordCode);
  router.post("/reset-password", resetPassword);
});

// profile routes
guarded(() => {
  router.get("/me", myProfile);
  router.post("/me", updateProfile);
  router.post("/logout", logout);
  router.post("/change-password", changePassword);
});
