import { router } from "@warlock.js/core";
import { guarded } from "app/utils/router";
import { createNewPostController } from "./controllers/create-new-post.controller";
import { updatePostController } from "./controllers/update-post.controller";

guarded(() => {
  router.route("/posts").create(createNewPostController).update(updatePostController);
});
