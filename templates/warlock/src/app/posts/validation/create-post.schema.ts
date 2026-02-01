import { v, type Infer } from "@warlock.js/core";

export const createPostSchema = v.object({
  title: v.string().required(),
  description: v.string(),
  image: v.file().image().maxSize({ size: 2, unit: "MB" }).saveTo("posts"),
});

export type CreatePostSchema = Infer<typeof createPostSchema>;
