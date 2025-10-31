import type { Request, RequestHandler, Response } from "@warlock.js/core";
import type { Post } from "app/posts/models/post";
import { getPostByIdService } from "app/posts/services/posts.service";
import {
  getPostSchema,
  type GetPostData,
} from "app/posts/validation/get-post.validation";

export const getPostController: RequestHandler = async (
  request: Request<Post, GetPostData>,
  response: Response,
) => {
  const post = await getPostByIdService(request.int("id"));

  if (!post) {
    return response.notFound({
      error: "Post Not found",
    });
  }

  return response.success({
    post,
  });
};

getPostController.validation = {
  schema: getPostSchema,
};
