import { router } from "@warlock.js/core";
import {
  guarded,
  guardedAdmin,
  guardedGuest,
  guardedGuestAdmin,
} from "app/utils/router";
import activateAccount from "./controllers/auth/activate-account";
import adminLogin from "./controllers/auth/admin-login";
import forgetPassword from "./controllers/auth/forget-password";
import { loginRequest } from "./controllers/auth/login.request";
import logout from "./controllers/auth/logout";
import { registerRequest } from "./controllers/auth/register.request";
import resendActivationCode from "./controllers/auth/resend-activation-code";
import resetPassword from "./controllers/auth/reset-password";
import verifyForgetPasswordCode from "./controllers/auth/verify-forget-password-code";
import changePassword from "./controllers/profile/change-password";
import myProfile from "./controllers/profile/my-profile";
import updateProfile from "./controllers/profile/update-profile";
import { restfulUsers } from "./controllers/restful-users";

// admin auth
guardedGuestAdmin(() => {
  router.post("/login", adminLogin);
  router.post("/forget-password", forgetPassword);
  router.post("/reset-password", resetPassword);
});

guardedAdmin(() => {
  // REST API for users
  router.restfulResource("/users", restfulUsers);
});

// user auth
guardedGuest(() => {
  router.post("/login", loginRequest);
  router.post("/register", registerRequest);
  router.post("/register/verify", activateAccount);
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
