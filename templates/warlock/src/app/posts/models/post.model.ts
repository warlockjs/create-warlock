import { Model, type Casts } from "@warlock.js/cascade";
import { PostOutput } from "../output/post.output";

export class Post extends Model {
  /**
   * Collection name
   */
  public static collection = "posts";

  /**
   * Output
   */
  public static output = PostOutput;

  /**
   * Casts
   */
  protected casts: Casts = {
    title: "string",
    content: "string",
  };
}
