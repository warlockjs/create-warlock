import { Random } from "@mongez/reinforcements";
import { seeder } from "@warlock.js/core";
import { User } from "../models/user";

export default seeder({
  name: "Seed Users",
  once: true,
  run: async () => {
    for (let i = 0; i < 10; i++) {
      await User.create({
        name: `User ${Random.int()}`,
        email: `user${Random.int()}@gmail.com`,
        password: `password-${Random.int()}`,
      });
    }

    return {
      recordsCreated: 10,
    };
  },
});
