import { migrationOffice } from "@warlock.js/cascade";
import { User } from "../user.model";

export default migrationOffice.register({
  name: "users",
  blueprint: User.blueprint(),
  up: blueprint => {
    blueprint.unique("id");
    blueprint.unique("email");
  },
  down(blueprint) {
    blueprint.dropUniqueIndex("id");
    blueprint.dropUniqueIndex("email");
  },
});
