import { type RequestHandler } from "@warlock.js/core";
import { Post } from "../models/post/post.model";
import { type UpdatePostRequest } from "../requests/update-post.request";
import { updatePostSchema } from "../validation/update-post.schema";

export const updatePostController: RequestHandler = async (
  request: UpdatePostRequest,
  response,
) => {
  const post = await Post.find(request.int("id"));

  if (!post) {
    return response.notFound();
  }

  await post.save({ merge: request.validated() });

  return response.success({
    post,
  });
};

updatePostController.validation = {
  schema: updatePostSchema,
};
