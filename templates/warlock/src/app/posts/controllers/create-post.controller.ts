import type { Request, RequestHandler, Response } from "@warlock.js/core";
import type { Post } from "app/posts/models/post";
import { createPostService } from "app/posts/services/posts.service";
import {
  createPostSchema,
  type CreatePostData,
} from "app/posts/validation/create-post.validation";

export const createPostController: RequestHandler = async (
  request: Request<Post, CreatePostData>,
  response: Response,
) => {
  const post = await createPostService(request.validated());

  return response.success({
    post,
  });
};

createPostController.validation = {
  schema: createPostSchema,
};
