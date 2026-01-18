import { Migration } from "@warlock.js/cascade";
import { Post } from "../psot.model";

export default class PostsMigration extends Migration.for(Post) {
  public up() {
    // Create table
    this.createTableIfNotExists();

    // Primary key
    this.id();

    // Post fields
    this.string("title", 255);
    this.text("description");
    this.string("slug", 255).unique();
    this.string("image", 500).nullable();

    // Status
    this.boolean("isActive").default(true);

    this.int("authorId").notNullable();

    // Embedded user references (JSONB for PostgreSQL)
    this.json("createdBy").nullable();
    this.json("updatedBy").nullable();
    this.json("deletedBy").nullable();

    // Timestamps
    this.timestamps();
    this.timestamp("deletedAt").nullable();
  }

  public down() {
    this.dropTableIfExists();
  }
}
