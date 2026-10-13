import { describe, expect, it } from "vitest";

import {
  isValid,
  validateConfirmPassword,
  validateDisplayName,
  validateEmail,
  validateLoginForm,
  validatePassword,
  validateRegisterForm,
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
