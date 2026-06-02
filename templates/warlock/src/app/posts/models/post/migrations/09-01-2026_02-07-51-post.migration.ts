import {
  bool,
  integer,
  json,
  Migration,
  string,
  text,
  timestamp,
} from "@warlock.js/cascade";
import { Post } from "../post.model";

export default Migration.create(Post, {
  title: string(255),
  description: text(),
  slug: string(255).unique(),
  image: string(500).nullable(),
  isActive: bool(),
  authorId: integer().notNullable(),
  createdBy: json().nullable(),
  updatedBy: json().nullable(),
  deletedBy: json().nullable(),
  deletedAt: timestamp().nullable(),
});
