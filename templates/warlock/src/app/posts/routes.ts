import { router } from "@warlock.js/core";
import { guarded } from "app/utils/router";
import { createPostController } from "./controllers/create-post.controller";
import { getAllPostsController } from "./controllers/get-all-posts.controller";
import { getPostController } from "./controllers/get-post.controller";

router.get("/posts", getAllPostsController);
router.get("/posts/:id", getPostController);

guarded(() => {
  router.post("/posts", createPostController);
});
