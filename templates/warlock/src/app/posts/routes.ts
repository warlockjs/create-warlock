import { router } from "@warlock.js/core";
import { guarded } from "../utils/router";
import { createNewPostRequest } from "./controllers/create-new-post.request";
import { getAllPostsRequest } from "./controllers/get-all-posts.request";
import { getPostRequest } from "./controllers/get-post.request";

router.get("/posts", getAllPostsRequest);
router.get("/posts/:id", getPostRequest);

guarded(() => {
  router.post("/posts", createNewPostRequest);
});
