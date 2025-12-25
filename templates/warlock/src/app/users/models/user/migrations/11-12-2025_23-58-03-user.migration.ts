import { migrationOffice, type Blueprint } from "@warlock.js/cascade";
import { User } from "../user.model";

export default migrationOffice.register({
  name: "userMigration",
  createdAt: "11-12-2025_23-58-03",
  blueprint: User.blueprint(),
  up: (blueprint: Blueprint) => {
    blueprint.unique("id");
  },
  down: (blueprint: Blueprint) => {
    blueprint.dropUniqueIndex("id");
  },
});
