import { integer, Migration, string, text, timestamp } from "@warlock.js/cascade";
import { Post } from "../post.model";

export default Migration.create(Post, {
  title: string(255),
  description: text(),
  slug: string(255).unique(),
  image: string(500).nullable(),
  authorId: integer().notNullable(),
  deletedAt: timestamp().nullable(),
});
