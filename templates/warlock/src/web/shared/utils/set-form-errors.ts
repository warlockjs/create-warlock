import type { FormInterface } from "@mongez/react-form";

export type FormErrorResponseKeys = {
  errors?: string;
  input?: string;
  error?: string;
};

type ErrorRecord = Record<string, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function setFormErrors(
  error: unknown,
  form: Pick<FormInterface, "setErrors">,
  keys: FormErrorResponseKeys = {},
): boolean {
  const errorsKey = keys.errors ?? "errors";
  const inputKey = keys.input ?? "input";
  const errorKey = keys.error ?? "error";

  try {
    if (!isRecord(error) || !isRecord(error.body)) {
      return false;
    }

    const errors = error.body[errorsKey];
    const fieldErrors: ErrorRecord = {};

    if (Array.isArray(errors)) {
      for (const issue of errors) {
        if (!isRecord(issue)) continue;

        const input = issue[inputKey];
        const message = issue[errorKey];

        if (typeof input === "string" && input && typeof message === "string") {
          fieldErrors[input] = message;
        }
      }
    } else if (isRecord(errors)) {
      for (const [input, message] of Object.entries(errors)) {
        if (input && typeof message === "string") {
          fieldErrors[input] = message;
        }
      }
    }

    if (Object.keys(fieldErrors).length === 0) {
      return false;
    }

    form.setErrors(fieldErrors);
    return true;
  } catch {
    return false;
  }
}
