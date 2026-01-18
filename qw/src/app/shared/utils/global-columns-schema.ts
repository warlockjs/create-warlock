import { v } from "@warlock.js/seal";

export const globalColumnsSchema = v.object({
  createdBy: v.embed("User"),
  updatedBy: v.embed("User"),
  deletedBy: v.embed("User"),
  isActive: v.boolean().default(true),
});
