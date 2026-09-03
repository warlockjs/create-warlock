export const localeCodes = ["en", "ar"] as const;

export type LocaleCode = (typeof localeCodes)[number];

export function isLocaleCode(locale: string): locale is LocaleCode {
  return localeCodes.includes(locale as LocaleCode);
}
