import { type GuardedRequestHandler } from "app/auth/requests/guarded.request";
import { Post } from "../models/post/post.model";
import { type CreatePostSchema, createPostSchema } from "../schema/create-post.schema";

export const createNewPostController: GuardedRequestHandler<CreatePostSchema> = async (
  request,
  response,
) => {
  const post = await Post.create({
    ...request.validated(),
    authorId: request.user.id,
  });

  return response.successCreate({
    post,
  });
};

createNewPostController.validation = {
  schema: createPostSchema,
};
