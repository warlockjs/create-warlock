import { type RequestHandler, v } from "@warlock.js/core";
import { Post } from "../models/post/post.model";

export const createNewPostController: RequestHandler = async (
  request,
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
  schema: v.object({
    title: v.string().required(),
    description: v.string(),
    image: v.file().image().maxSize({ size: 2, unit: "MB" }).saveTo("posts"),
  }),
};
