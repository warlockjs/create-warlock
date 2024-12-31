import {
  v,
  type Request,
  type RequestHandler,
  type Response,
} from "@warlock.js/core";
import { Post } from "../models";

export const getPostRequest: RequestHandler = async (
  request: Request,
  response: Response,
) => {
  // 👇 look at the custom validation function
  const post: Post = request.post;

  return response.success({
    post,
  });
};

getPostRequest.validation = {
  schema: v.object({
    id: v.int().required(),
  }),
  validate: async (request: Request, response: Response) => {
    const post = await Post.find(request.int("id"));

    if (!post) {
      return response.notFound({
        error: "Post Not found",
      });
    }

    // inject the post into the request object
    request.post = post;
  },
};
