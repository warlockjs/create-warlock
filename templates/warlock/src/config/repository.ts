import type { RepositoryConfigurations } from "@warlock.js/core";

export default {
  isActiveColumn: "status",
  isActiveValue: "active",
  defaultOptions: {
    orderBy: {
      created_at: "desc",
    },
  },
} as RepositoryConfigurations;
