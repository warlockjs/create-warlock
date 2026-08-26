import { Auth } from "@warlock.js/auth";
import { RegisterModel } from "@warlock.js/cascade";
import { useHashedPassword } from "@warlock.js/core";
import { type Infer, v } from "@warlock.js/seal";
import { UserResource } from "app/users/resources/user.resource";

export const userSchema = v.object({
  name: v.string().required(),
  email: v.email().requiredIfEmpty("id"),
  image: v.string(),
  password: v.string().min(6).requiredIfEmpty("id").addTransformer(useHashedPassword()),
  // Written by the social-login handler (`app/users/services/login-social.ts`).
  // A field only reachable through `save({ merge })` still has to be declared
  // here — `merge` is typed against this schema, so an undeclared key is a
  // compile error, not a silent write.
  lastLogin: v.date(),
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
    this.addScope("admins", (query) => {
      query.where("role", "admin");
    });

    this.addScope("verified", (query) => {
      query.where("emailVerified", true);
    });
  }
}
