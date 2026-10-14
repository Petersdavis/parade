import { describe, expect, it } from "vitest";

import { isCanonicalCommunityId } from "./ontario-communities";
import {
  isValid,
  validateCommunity,
  validateConfirmPassword,
  validateDisplayName,
  validateEmail,
  validateFirstName,
  validateLastName,
  validateLoginForm,
  validatePassword,
  validateProfileForm,
  validateRegisterForm,
  validateWaitlistForm,
} from "./validation";

describe("validateEmail", () => {
  it("requires a value", () => {
    expect(validateEmail("")).toBe("Email is required.");
  });

  it("rejects malformed addresses", () => {
    expect(validateEmail("not-an-email")).toBe("Enter a valid email address.");
    expect(validateEmail("missing@domain")).toBe("Enter a valid email address.");
  });

  it("accepts a valid address", () => {
    expect(validateEmail("jane@example.com")).toBeUndefined();
  });
});

describe("validatePassword", () => {
  it("requires a value", () => {
    expect(validatePassword("")).toBe("Password is required.");
  });

  it("enforces a minimum length", () => {
    expect(validatePassword("short")).toMatch(/at least 8 characters/);
  });

  it("accepts a sufficiently long password", () => {
    expect(validatePassword("longenough")).toBeUndefined();
  });
});

describe("validateDisplayName", () => {
  it("requires a value", () => {
    expect(validateDisplayName("  ")).toBe("Name is required.");
  });

  it("enforces a minimum length", () => {
    expect(validateDisplayName("A")).toBe("Name must be at least 2 characters.");
  });

  it("accepts a valid name", () => {
    expect(validateDisplayName("Jane")).toBeUndefined();
  });
});

describe("validateConfirmPassword", () => {
  it("requires a value", () => {
    expect(validateConfirmPassword("password1", "")).toBe("Please confirm your password.");
  });

  it("rejects mismatches", () => {
    expect(validateConfirmPassword("password1", "password2")).toBe("Passwords do not match.");
  });

  it("accepts a match", () => {
    expect(validateConfirmPassword("password1", "password1")).toBeUndefined();
  });
});

describe("validateRegisterForm", () => {
  it("returns errors for every invalid field", () => {
    const errors = validateRegisterForm({
      displayName: "",
      email: "bad",
      password: "short",
      confirmPassword: "different",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "confirmPassword",
      "displayName",
      "email",
      "password",
    ]);
    expect(isValid(errors)).toBe(false);
  });

  it("returns no errors for a valid form", () => {
    const errors = validateRegisterForm({
      displayName: "Jane",
      email: "jane@example.com",
      password: "longenough",
      confirmPassword: "longenough",
    });
    expect(isValid(errors)).toBe(true);
  });
});

describe("validateLoginForm", () => {
  it("requires email and password", () => {
    const errors = validateLoginForm({ email: "", password: "" });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it("does not enforce password length on login", () => {
    const errors = validateLoginForm({ email: "jane@example.com", password: "x" });
    expect(isValid(errors)).toBe(true);
  });
});

describe("validateCommunity", () => {
  it("requires a value", () => {
    expect(validateCommunity("", isCanonicalCommunityId)).toBe("Please choose your community.");
  });

  it("rejects non-canonical values", () => {
    expect(validateCommunity("atlantis", isCanonicalCommunityId)).toBe(
      "Please choose a community from the list.",
    );
  });

  it("accepts canonical values", () => {
    expect(validateCommunity("toronto", isCanonicalCommunityId)).toBeUndefined();
  });
});

describe("validateWaitlistForm", () => {
  it("returns errors for every invalid field", () => {
    const errors = validateWaitlistForm(
      { name: "", email: "bad", community: "atlantis" },
      isCanonicalCommunityId,
    );
    expect(Object.keys(errors).sort()).toEqual(["community", "email", "name"]);
    expect(isValid(errors)).toBe(false);
  });

  it("returns no errors for a valid form", () => {
    const errors = validateWaitlistForm(
      { name: "Jane", email: "jane@example.com", community: "ottawa" },
      isCanonicalCommunityId,
    );
    expect(isValid(errors)).toBe(true);
  });
});

describe("validateFirstName", () => {
  it("requires a value", () => {
    expect(validateFirstName("  ")).toBe("First name is required.");
  });

  it("enforces a minimum length", () => {
    expect(validateFirstName("A")).toBe("First name must be at least 2 characters.");
  });

  it("accepts a valid name", () => {
    expect(validateFirstName("Jane")).toBeUndefined();
  });
});

describe("validateLastName", () => {
  it("requires a value", () => {
    expect(validateLastName("  ")).toBe("Last name is required.");
  });

  it("enforces a minimum length", () => {
    expect(validateLastName("D")).toBe("Last name must be at least 2 characters.");
  });

  it("accepts a valid name", () => {
    expect(validateLastName("Doe")).toBeUndefined();
  });
});

describe("validateProfileForm", () => {
  it("returns errors for every invalid field", () => {
    const errors = validateProfileForm(
      { firstName: "", lastName: "", email: "bad", community: "atlantis" },
      isCanonicalCommunityId,
    );
    expect(Object.keys(errors).sort()).toEqual([
      "community",
      "email",
      "firstName",
      "lastName",
    ]);
    expect(isValid(errors)).toBe(false);
  });

  it("returns no errors for a valid form", () => {
    const errors = validateProfileForm(
      { firstName: "Jane", lastName: "Doe", email: "jane@example.com", community: "ottawa" },
      isCanonicalCommunityId,
    );
    expect(isValid(errors)).toBe(true);
  });
});
