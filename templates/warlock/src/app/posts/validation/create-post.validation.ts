import { v, type Infer } from "@warlock.js/core";

export const createPostSchema = v.object({
  title: v.string().required().minLength(4),
  content: v.string().required(),
});

export type CreatePostData = Infer<typeof createPostSchema>;
