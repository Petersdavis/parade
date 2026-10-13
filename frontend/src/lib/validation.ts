/**
 * Client-side form validation for the auth flows.
 *
 * Pure functions with no Firebase/React dependency so they are trivially
 * unit-testable and reusable across the register and login forms.
 */

export interface FieldErrors {
  [field: string]: string | undefined;
}

/** Minimum password length enforced client-side (mirrors Firebase's default). */
export const MIN_PASSWORD_LENGTH = 8;

// Pragmatic email check: a non-empty local part, an "@", and a dotted domain.
// Deliberately permissive — the authoritative check is Firebase's.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) {
    return "Email is required.";
  }
  if (!EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address.";
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

export function validateDisplayName(name: string): string | undefined {
  const value = name.trim();
  if (!value) {
    return "Name is required.";
  }
  if (value.length < 2) {
    return "Name must be at least 2 characters.";
  }
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return undefined;
}

export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Validate the full registration form. Returns a map of field -> error. */
export function validateRegisterForm(input: RegisterInput): FieldErrors {
  const errors: FieldErrors = {
    displayName: validateDisplayName(input.displayName),
    email: validateEmail(input.email),
    password: validatePassword(input.password),
    confirmPassword: validateConfirmPassword(input.password, input.confirmPassword),
  };
  return pruneEmpty(errors);
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Validate the login form. Returns a map of field -> error. */
export function validateLoginForm(input: LoginInput): FieldErrors {
  const errors: FieldErrors = {
    email: validateEmail(input.email),
    // On login we only require a non-empty password; length rules belong to sign-up.
    password: input.password ? undefined : "Password is required.",
  };
  return pruneEmpty(errors);
}

/** True when a validation result contains no errors. */
export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}

function pruneEmpty(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => value !== undefined),
  ) as FieldErrors;
}
