import { type FormControlProps, useFormControl, useSubmitButton } from "@mongez/react-form";
import { type ReactNode } from "react";

type ContactFieldProps = FormControlProps & {
  label: ReactNode;
  multiline?: boolean;
  rows?: number;
};

export function ContactField({ label, multiline, rows, ...props }: ContactFieldProps) {
  const { error, getErrorProps, getInputProps, id } = useFormControl(props);
  const inputProps = getInputProps(rows ? { rows } : undefined);

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      {multiline ? <textarea {...inputProps} /> : <input {...inputProps} />}
      {error ? (
        <small className="warlock-field-error" {...getErrorProps()}>
          {error}
        </small>
      ) : null}
    </label>
  );
}

export function ContactSubmitButton({
  idleLabel,
  submittingLabel,
}: {
  idleLabel: ReactNode;
  submittingLabel: ReactNode;
}) {
  const { disabled, isSubmitting } = useSubmitButton();

  return (
    <button className="warlock-contact-submit" type="submit" disabled={disabled}>
      {isSubmitting ? submittingLabel : idleLabel}
      <span aria-hidden="true">→</span>
    </button>
  );
}
