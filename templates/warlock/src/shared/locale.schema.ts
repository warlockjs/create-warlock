import { v, type Infer } from "@warlock.js/seal";
import { localeCodes } from "./locales";

export const localeSchema = v.object({
  locale: v
    .string()
    .in([...localeCodes])
    .required(),
});

export type LocaleSchema = Infer.Output<typeof localeSchema>;
