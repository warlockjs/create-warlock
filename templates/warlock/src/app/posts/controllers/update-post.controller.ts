import { type GuardedRequestHandler } from "app/auth/requests/guarded.request";
import { Post } from "../models/post/post.model";
import { type UpdatePostSchema, updatePostSchema } from "../schema/update-post.schema";

export const updatePostController: GuardedRequestHandler<UpdatePostSchema> = async (
  request,
  response,
) => {
  const id = request.int("id");

  if (!id) {
    return response.notFound();
  }

  const post = await Post.find(id);

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
