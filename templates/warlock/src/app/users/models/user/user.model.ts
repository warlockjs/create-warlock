import { Auth, castPassword } from "@warlock.js/auth";
import type { Casts, Document, Joinable } from "@warlock.js/cascade";
import { castEmail, expiresAfter } from "@warlock.js/cascade";
import { uploadable } from "@warlock.js/core";
import { Post } from "../../../posts/models";
import { UserOutput } from "../../output/user.output";

export class User extends Auth {
  /**
   * Collection name
   */
  public static collection = "users";

  /**
   * Output
   */
  public static output = UserOutput;

  /**
   * {@inheritdoc}
   */
  public syncWith = [];

  public static relations: Record<string, Joinable> = {
    totalPosts: Post.joinable("id", "author.id"),
  };

  /**
   * Get user type
   */
  public get userType(): string {
    return "user";
  }

  /**
   * {@inheritDoc}
   */
  public defaultValue: Document = {
    isActive: false,
  };

  /**
   * {@inheritDoc}
   */
  protected casts: Casts = {
    name: "string",
    isActive: "boolean",
    image: uploadable,
    email: castEmail,
    password: castPassword,
    activationCode: "int",
    codeExpiresAt: expiresAfter(30, "minutes"),
  };

  /**
   * {@inheritdoc}
   */
  public embedded = ["id", "name", "email"];
}
