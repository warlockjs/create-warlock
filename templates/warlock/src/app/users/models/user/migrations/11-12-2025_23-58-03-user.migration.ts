import { Migration } from "@warlock.js/cascade";
import { User } from "../user.model";

export default class UsersMigration extends Migration.for(User) {
  public up() {
    this.int("id").unique().autoIncrement();
    this.unique("email");
  }

  public down() {
    this.dropIndex("id");
    this.dropUnique("email");
  }
}
