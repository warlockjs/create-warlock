import { json, Migration, string, timestamp } from "@warlock.js/cascade";
import { User } from "../user.model";

export default Migration.create(User, {
  name: string(255),
  email: string(255).unique(),
  password: string(255),
  image: string(500).nullable(),
  imageMetadata: json().nullable(),
  deletedAt: timestamp().nullable(),
});
