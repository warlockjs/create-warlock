import { Auth } from "@warlock.js/auth";
import { RegisterModel } from "@warlock.js/cascade";
import { useHashedPassword } from "@warlock.js/core";
import { type Infer, v } from "@warlock.js/seal";
import { globalColumnsSchema } from "app/shared/utils/global-columns-schema";
import { UserResource } from "app/users/resources/user.resource";

export const userSchema = globalColumnsSchema.extend({
  name: v.string().required(),
  email: v.email().requiredIfEmpty("id"),
  image: v.string(),
  password: v
    .string()
    .min(6)
    .requiredIfEmpty("id")
    .addTransformer(useHashedPassword()),
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
    this.addScope("active", query => {
      query.where("isActive", true);
    });

    this.addScope("admins", query => {
      query.where("role", "admin");
    });

    this.addScope("verified", query => {
      query.where("emailVerified", true);
    });

    // this.addGlobalScope("active", (query) => {
    //   query.where("isActive", true);
    // });
  }
}
