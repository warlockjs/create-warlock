import { Model, RegisterModel } from "@warlock.js/cascade";
import { useComputedSlug } from "@warlock.js/core";
import { type Infer, v } from "@warlock.js/seal";
import { PostResource } from "app/posts/resources/post.resource";
import { globalColumnsSchema } from "app/shared/utils/global-columns-schema";

export const postSchema = globalColumnsSchema.extend({
  title: v.string().required(),
  description: v.string().required(),
  slug: v.computed(useComputedSlug()),
  image: v.string().required(),
});

type PostSchema = Infer<typeof postSchema>;

@RegisterModel()
export class Post extends Model<PostSchema> {
  public static table = "posts";

  public static schema = postSchema;

  public static relations = {};

  public static resource = PostResource;
}
