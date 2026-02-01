import { type RequestHandler } from "@warlock.js/core";
import { Post } from "../models/post/post.model";
import { type CreatePostRequest } from "../requests/create-post.request";
import { createPostSchema } from "../validation/create-post.schema";

export const createNewPostController: RequestHandler = async (
  request: CreatePostRequest,
  response,
) => {
  const post = await Post.create({
    ...request.validated(),
    authorId: request.user.id,
  });

  return response.success({
    post,
  });
};

createNewPostController.validation = {
  schema: createPostSchema,
};
