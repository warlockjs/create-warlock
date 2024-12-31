import {
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";
import { Post } from "../models";

export const getAllPostsRequest: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  const posts = await Post.list();

  return response.success({
    posts,
  });
};
