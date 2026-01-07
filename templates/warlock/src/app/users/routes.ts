import { router } from "@warlock.js/core";
import { guarded } from "app/utils/router";
import { createNewUserController } from "./controllers/create-new-user.controller";
import { getUsersController } from "./controllers/get-users.controller";

router.post("/users", createNewUserController);

guarded(() => {
  router.get("/users", getUsersController);
});
