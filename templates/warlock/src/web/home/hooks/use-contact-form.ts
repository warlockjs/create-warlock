import { http } from "@mongez/http";
import { type FormSubmitOptions, type InferFormValues } from "@mongez/react-form";
import { useState } from "react";
import type { contactSchema } from "../../../shared/contact.schema";
import { setFormErrors } from "../../shared/utils/set-form-errors";

type ContactValues = InferFormValues<typeof contactSchema>;

type ContactResponse = {
  message: string;
  received: {
    email: string;
    characters: number;
  };
};

type ContactStatus = {
  state: "idle" | "submitting" | "success" | "error";
  message: string;
};

export function useContactForm() {
  const [status, setStatus] = useState<ContactStatus>({ state: "idle", message: "" });

  async function submitContact({
    values,
    form,
  }: FormSubmitOptions<typeof contactSchema>): Promise<void> {
    setStatus({ state: "submitting", message: "Sending to the backend…" });

    try {
      const result = await http.post<ContactResponse>("/api/contact", values as ContactValues);

      if (result.error) {
        if (result.error.isValidationError) {
          setFormErrors(result.error, form);
        }

        setStatus({
          state: "error",
          message: result.error.message || "The request was not accepted.",
        });
        return;
      }

      setStatus({ state: "success", message: result.data?.message });
      form.reset();
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Could not reach the backend.",
      });
    }
  }

  return { status, submitContact };
}
