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

export function validateFirstName(name: string): string | undefined {
  const value = name.trim();
  if (!value) {
    return "First name is required.";
  }
  if (value.length < 2) {
    return "First name must be at least 2 characters.";
  }
  return undefined;
}

export function validateLastName(name: string): string | undefined {
  const value = name.trim();
  if (!value) {
    return "Last name is required.";
  }
  if (value.length < 2) {
    return "Last name must be at least 2 characters.";
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

export interface ProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  community: string;
}

/**
 * Validate the waitlist profile-completion form.
 *
 * `community` must be one of the canonical Ontario community ids; the caller
 * passes the set of valid ids so this module stays free of the community data.
 */
export function validateProfileForm(
  input: ProfileInput,
  isCanonicalCommunity: (id: string) => boolean,
): FieldErrors {
  const errors: FieldErrors = {
    firstName: validateFirstName(input.firstName),
    lastName: validateLastName(input.lastName),
    email: validateEmail(input.email),
    community: validateCommunity(input.community, isCanonicalCommunity),
  };
  return pruneEmpty(errors);
}

export interface WaitlistInput {
  name: string;
  email: string;
  community: string;
}

/**
 * Validate the waitlist signup form.
 *
 * `community` must be one of the canonical Ontario community ids; the caller
 * passes the set of valid ids so this module stays free of the community data.
 */
export function validateWaitlistForm(
  input: WaitlistInput,
  isCanonicalCommunity: (id: string) => boolean,
): FieldErrors {
  const errors: FieldErrors = {
    name: validateDisplayName(input.name),
    email: validateEmail(input.email),
    community: validateCommunity(input.community, isCanonicalCommunity),
  };
  return pruneEmpty(errors);
}

/** Validate that a community value is one of the canonical options. */
export function validateCommunity(
  community: string,
  isCanonicalCommunity: (id: string) => boolean,
): string | undefined {
  const value = community.trim();
  if (!value) {
    return "Please choose your community.";
  }
  if (!isCanonicalCommunity(value)) {
    return "Please choose a community from the list.";
  }
  return undefined;
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
