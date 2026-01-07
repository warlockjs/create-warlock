import { router } from "@warlock.js/core";
import { cloudUpload, guarded } from "app/utils/router";
import { createNewPostController } from "./controllers/create-new-post.controller";
import { updatePostController } from "./controllers/update-post.controller";

guarded(() => {
  cloudUpload(() => {
    router.post("/posts", createNewPostController);
  });
  router.put("/posts/:id", updatePostController);
});
