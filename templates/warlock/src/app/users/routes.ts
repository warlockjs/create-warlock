import { router } from "@warlock.js/core";
import { getUsersController } from "./controllers/get-users.controller";

router.get("/users", getUsersController);
