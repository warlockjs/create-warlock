import { router } from "@warlock.js/core";
import { guarded } from "app/shared/utils/router";
import { createNewUserController } from "./controllers/create-new-user.controller";
import { getUsersController } from "./controllers/get-users.controller";

guarded(() => {
  router.route("/users").get(getUsersController).post(createNewUserController);
});
