import {
  v,
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";
import { Post } from "../models";

export const createNewPostRequest: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  const post = await Post.create(request.validated());

  return response.success({
    message: "Post created successfully",
    post,
  });
};

createNewPostRequest.validation = {
  schema: v.object({
    title: v.string().required().minLength(4),
    content: v.string().required(),
  }),
};
