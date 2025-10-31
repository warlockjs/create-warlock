import type { RequestHandler, Response } from "@warlock.js/core";
import { getAllPostsService } from "app/posts/services/posts.service";

export const getAllPostsController: RequestHandler = async (
  request,
  response: Response,
) => {
  const posts = await getAllPostsService();

  return response.success({
    posts,
  });
};
