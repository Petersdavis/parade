import { describe, expect, it } from "vitest";

import { getAuthErrorMessage } from "./auth";

describe("getAuthErrorMessage", () => {
  it("maps known Firebase error codes to friendly copy", () => {
    expect(getAuthErrorMessage({ code: "auth/email-already-in-use" })).toMatch(/already exists/i);
    expect(getAuthErrorMessage({ code: "auth/invalid-email" })).toMatch(/valid/i);
    expect(getAuthErrorMessage({ code: "auth/weak-password" })).toMatch(/stronger password/i);
    expect(getAuthErrorMessage({ code: "auth/wrong-password" })).toMatch(/incorrect/i);
    expect(getAuthErrorMessage({ code: "auth/invalid-credential" })).toMatch(/incorrect/i);
    expect(getAuthErrorMessage({ code: "auth/too-many-requests" })).toMatch(/too many/i);
    expect(getAuthErrorMessage({ code: "auth/popup-closed-by-user" })).toMatch(/cancelled/i);
    expect(getAuthErrorMessage({ code: "auth/network-request-failed" })).toMatch(/network/i);
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(getAuthErrorMessage({ code: "auth/something-new" })).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("handles non-error inputs", () => {
    expect(getAuthErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
    expect(getAuthErrorMessage("boom")).toBe("Something went wrong. Please try again.");
  });
});
