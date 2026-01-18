import { Migration } from "@warlock.js/cascade";
import { User } from "../user.model";

export default class UsersMigration extends Migration.for(User) {
  public up() {
    // Create table
    this.createTableIfNotExists();

    // Primary key
    this.id(); // Creates "id" SERIAL PRIMARY KEY

    // User fields
    this.string("name", 255);
    this.string("email", 255).unique();
    this.string("password", 255);
    this.string("image", 500).nullable();
    this.json("imageMetadata").nullable();

    // Status
    this.boolean("isActive").default(true);

    // Embedded user references (JSONB for PostgreSQL)
    this.json("createdBy").nullable();
    this.json("updatedBy").nullable();
    this.json("deletedBy").nullable();

    // Timestamps (auto-managed by the model)
    this.timestamps(); // Creates createdAt and updatedAt
    this.timestamp("deletedAt").nullable(); // Soft deletes
  }

  public down() {
    this.dropTableIfExists();
  }
}
