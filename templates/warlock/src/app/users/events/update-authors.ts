import { Aggregate, database } from "@warlock.js/cascade";
import { User } from "../models/user";

User.events().onSaved(async (user: User) => {
  // list all collections in the database
  const collections = await database.listCollectionNames();

  // this will update the createdBy and updatedBy fields in all collections
  // it may take some time if you have a lot of collections or documents but it's the best way to do it
  for (const collection of collections) {
    new Aggregate(collection).where("createdBy.id", user.id).update({
      createdBy: user.embeddedData,
    });

    new Aggregate(collection).where("updatedBy.id", user.id).update({
      updatedBy: user.embeddedData,
    });
  }
});
