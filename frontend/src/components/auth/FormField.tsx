"use client";

import { useId, type InputHTMLAttributes } from "react";

import styles from "./FormField.module.css";

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  /** Validation error for this field; renders below the input when present. */
  error?: string;
}

/**
 * Labelled text input with accessible error messaging.
 *
 * Wires up `aria-invalid` and `aria-describedby` so screen readers announce the
 * error alongside the field.
 */
export function FormField({ label, error, ...rest }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={[styles.input, error ? styles.inputError : null].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
