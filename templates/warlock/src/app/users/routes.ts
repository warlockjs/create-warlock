import { guestLogin } from "@warlock.js/auth";
import { router } from "@warlock.js/core";
import {
  adminPath,
  guarded,
  guardedAdmin,
  guardedGuest,
  guardedGuestAdmin,
} from "app/utils/router";
import activateAccount from "./controllers/auth/activate-account";
import adminLogin from "./controllers/auth/admin-login";
import createAccount from "./controllers/auth/create-account";
import forgetPassword from "./controllers/auth/forget-password";
import login from "./controllers/auth/login";
import logout from "./controllers/auth/logout";
import resendActivationCode from "./controllers/auth/resend-activation-code";
import resetPassword from "./controllers/auth/reset-password";
import verifyForgetPasswordCode from "./controllers/auth/verify-forget-password-code";
import changePassword from "./controllers/profile/change-password";
import myProfile from "./controllers/profile/my-profile";
import updateProfile from "./controllers/profile/update-profile";
import { restfulUsers } from "./controllers/restful-users";

// guest login
// If you are going to use guest as a user type, you can use this route
// otherwise, you can remove this route, also you may remove the guest model from the src/config/auth.ts config file
router.post([adminPath("/login/guests"), "/login/guests"], guestLogin);

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
  router.post("/login", login);
  router.post("/register", createAccount);
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
