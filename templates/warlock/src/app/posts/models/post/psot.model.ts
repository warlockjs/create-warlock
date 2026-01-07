import { Model, RegisterModel } from "@warlock.js/cascade";
import { defineResource, useComputedSlug } from "@warlock.js/core";
import { type Infer, v } from "@warlock.js/seal";
import { globalColumnsSchema } from "app/shared/utils/global-columns-schema";

export const postSchema = globalColumnsSchema.extend({
  title: v.string().required(),
  description: v.string().required(),
  slug: v.computed(useComputedSlug()),
  image: v.string().required(),
});

export type PostSchema = Infer<typeof postSchema>;

@RegisterModel()
export class Post extends Model<PostSchema> {
  public static table = "posts";

  public static schema = postSchema;

  public static resource = defineResource({
    schema: {
      id: "number",
      slug: "string",
      title: "string",
      description: "string",
      image: "storageUrl",
      createdBy: "object",
      updatedBy: "object",
      isActive: "boolean",
    },
  });
}
