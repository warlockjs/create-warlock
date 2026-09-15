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

type ContactErrorBody = {
  message?: string;
  errors?: unknown;
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
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values as ContactValues),
      });

      const body = (await response.json().catch(() => ({}))) as ContactErrorBody &
        Partial<ContactResponse>;

      if (!response.ok) {
        if (response.status === 422) {
          setFormErrors({ body }, form);
        }

        setStatus({
          state: "error",
          message: body.message || "The request was not accepted.",
        });
        return;
      }

      setStatus({ state: "success", message: body.message ?? "" });
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
