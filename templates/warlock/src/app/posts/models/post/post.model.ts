import { Model, RegisterModel } from "@warlock.js/cascade";
import { useComputedSlug } from "@warlock.js/core";
import { type Infer, v } from "@warlock.js/seal";
import { PostResource } from "app/posts/resources/post.resource";

export const postSchema = v.object({
  title: v.string(),
  description: v.string(),
  slug: v.computed(useComputedSlug()),
  image: v.string(),
});

type PostSchema = Infer<typeof postSchema>;

@RegisterModel()
export class Post extends Model<PostSchema> {
  public static table = "posts";

  public static schema = postSchema;

  public static resource = PostResource;
}
