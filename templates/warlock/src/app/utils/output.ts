import type { FinalOutput } from "@warlock.js/core";

/**
 * Merge the output with this function will return the base output details
 * Only and only if any of these keys are present
 */
export function withBaseOutputDetails(moreOptions: FinalOutput): FinalOutput {
  return {
    id: "integer",
    isActive: "boolean",
    createdAt: "date",
    updatedAt: "date",
    createdBy: "object",
    updatedBy: "object",
    ...moreOptions,
  };
}
