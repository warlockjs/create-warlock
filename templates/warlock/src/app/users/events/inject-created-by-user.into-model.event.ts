import { Model } from "@warlock.js/cascade";
import { useCurrentUser } from "@warlock.js/core";

const globalEvents = Model.globalEvents();

const saveSubscription = globalEvents.onSaving(async (model, { isInsert }) => {
  const user = useCurrentUser();

  if (!user) return;

  if (isInsert) {
    if (model.schemaHas("createdBy")) {
      model.set("createdBy", user);
    }
  }

  if (model.schemaHas("updatedBy")) {
    model.set("updatedBy", user);
  }
});

const deleteSubscription = globalEvents.onDeleting(async (model) => {
  const user = useCurrentUser();

  if (!user) return;

  if (model.schemaHas("deletedBy")) {
    model.set("deletedBy", user);
  }
});

export const cleanup = [saveSubscription, deleteSubscription];
