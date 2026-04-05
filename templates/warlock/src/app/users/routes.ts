import { router } from "@warlock.js/core";
import { guarded } from "app/shared/utils/router";
import { createNewUserController } from "./controllers/create-new-user.controller";
import { listUsersController } from "./controllers/list-users.controller";

guarded(() => {
  router
    .route("/users")
    .list(listUsersController)
    .post(createNewUserController);
});
