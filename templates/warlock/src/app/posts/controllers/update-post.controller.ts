import { type RequestHandler } from "@warlock.js/core";
import { v } from "@warlock.js/seal";
import { Post } from "../models/post/post.model";

export const updatePostController: RequestHandler = async (
  request,
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
  schema: v.object({
    title: v.string().required(),
    description: v.string(),
    image: v.file().image().maxSize({ size: 2, unit: "MB" }).saveTo("posts"),
  }),
};
