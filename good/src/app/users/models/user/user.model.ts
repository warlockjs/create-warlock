import { Auth } from "@warlock.js/auth";
import { hasMany, RegisterModel } from "@warlock.js/cascade";
import { defineResource, uploadedFileMetadataSchema, useHashedPassword } from "@warlock.js/core";
import { type Infer, v } from "@warlock.js/seal";
import { type Post } from "app/posts/models/post/psot.model";
import { globalColumnsSchema } from "app/shared/utils/global-columns-schema";

const UserResource = defineResource({
  schema: {
    id: "number",
    name: "string",
    email: "string",
    image: "storageUrl",
    createdAt: "date",
    updatedAt: "date",
    isActive: "boolean",
    type: () => "user",
  },
});

export const userSchema = globalColumnsSchema.extend({
  name: v.string().required().trim(),
  email: v.email().requiredIfEmpty("id").unique("User"),
  image: v.string(),
  imageMetadata: uploadedFileMetadataSchema,
  password: v.string().min(6).requiredIfEmpty("id").addTransformer(useHashedPassword()),
});

export type UserSchema = Infer<typeof userSchema>;

@RegisterModel()
export class User extends Auth<UserSchema> {
  /**
   * Collection name
   */
  public static table = "users";

  /**
   * Model Schema
   */
  public static schema = userSchema;

  public static relations = {
    posts: hasMany("Post", { foreignKey: "authorId" }),
  };

  public posts?: Post[];

  /**
   * Embed fields when saving in another model
   */
  public static embed = ["id", "name"];

  /**
   * Resource to be used when converting the model to JSON
   */
  public static resource = UserResource;

  /**
   * User type identifier
   */
  public get userType(): string {
    return "user";
  }

  static {
    // Local scopes
    this.addScope("active", (query) => {
      query.where("isActive", true);
    });

    this.addScope("admins", (query) => {
      query.where("role", "admin");
    });

    this.addScope("verified", (query) => {
      query.where("emailVerified", true);
    });

    // this.addGlobalScope("active", (query) => {
    //   query.where("isActive", true);
    // });
  }
}
