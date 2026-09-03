import { http } from "@mongez/http";
import { useState } from "react";
import { type LocaleCode } from "../../../shared/locales";

type LocalePreferenceResponse = {
  locale: LocaleCode;
};

export function useLocaleSwitcher() {
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState("");

  async function switchLocale(locale: LocaleCode): Promise<void> {
    setIsSwitching(true);
    setError("");

    try {
      const result = await http.post<LocalePreferenceResponse>("/api/locale", { locale });

      if (result.error) {
        setError(result.error.message || "Could not update the locale.");
        setIsSwitching(false);
        return;
      }

      window.location.hash = "contact";
      window.location.reload();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update the locale.");
      setIsSwitching(false);
    }
  }

  return { error, isSwitching, switchLocale };
}
