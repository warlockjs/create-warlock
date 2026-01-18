import { defineResource } from "@warlock.js/core";

export const PostResource = defineResource({
  schema: {
    id: "number",
    slug: "string",
    title: "string",
    description: "string",
    image: "storageUrl",
    createdBy: "object",
    updatedBy: "object",
    isActive: "boolean",
  },
});
