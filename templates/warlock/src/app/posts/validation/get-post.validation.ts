import { v, type Infer } from "@warlock.js/core";

export const getPostSchema = v.object({
  id: v.int().required(),
});

export type GetPostData = Infer<typeof getPostSchema>;
