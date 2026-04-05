import { defineResource } from "@warlock.js/core";

export const UserResource = defineResource({
  schema: {
    id: "number",
    name: "string",
    email: "string",
    image: "storageUrl",
    createdAt: "date",
    updatedAt: "date",
    isActive: "boolean",
    type: () => "user",
  },
});
