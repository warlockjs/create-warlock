import { isCancel, log, multiselect } from "@clack/prompts";
import {
  getAiPackageOptions,
  getAiProviderOptions,
} from "../features/features-map";

const NO_AI = "none";

const aiOptions = [
  ...getAiProviderOptions(),
  ...getAiPackageOptions(),
  {
    value: NO_AI,
    label: "None",
    hint: "Do not add AI providers or capability packages",
  },
];

/** Ask for optional AI packages without leaking the UI-only None sentinel. */
export async function askAiFeatures(
  initialValues: string[] = [],
): Promise<string[] | symbol> {
  let selectedValues = initialValues.filter(value => value !== NO_AI);

  while (true) {
    const answer = await multiselect({
      message:
        "Add AI packages? Providers + capabilities — the core AI package is included automatically",
      options: aiOptions,
      initialValues: selectedValues,
      required: false,
    });

    if (isCancel(answer)) return answer;

    const selected = answer as string[];

    if (!selected.includes(NO_AI)) return selected;

    if (selected.length === 1) return [];

    log.warn("Choose None by itself, or select one or more AI packages.");

    selectedValues = selected.filter(value => value !== NO_AI);
  }
}
