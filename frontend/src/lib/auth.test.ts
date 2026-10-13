import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";

import {
  VERIFICATION_RESEND_COOLDOWN_MS,
  VerificationRateLimitError,
  getAuthErrorMessage,
  getVerificationResendCooldown,
  resetVerificationCooldown,
  sendVerificationEmail,
} from "./auth";

const sendEmailVerification = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendEmailVerification: (...args: unknown[]) => sendEmailVerification(...args),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("./firebase", () => ({
  getFirebaseAuth: () => ({ currentUser: null }),
  getFirebaseFirestore: () => ({}),
}));

function fakeUser(uid = "user-1"): User {
  return { uid } as User;
}

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

  it("maps verification-specific error codes", () => {
    expect(getAuthErrorMessage({ code: "auth/expired-action-code" })).toMatch(/expired/i);
    expect(getAuthErrorMessage({ code: "auth/invalid-action-code" })).toMatch(/no longer valid/i);
    expect(getAuthErrorMessage({ code: "auth/user-disabled" })).toMatch(/disabled/i);
    expect(getAuthErrorMessage({ code: "auth/requires-recent-login" })).toMatch(/sign in again/i);
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

describe("sendVerificationEmail", () => {
  beforeEach(() => {
    sendEmailVerification.mockReset();
    sendEmailVerification.mockResolvedValue(undefined);
    resetVerificationCooldown();
  });

  afterEach(() => {
    resetVerificationCooldown();
  });

  it("sends the verification email and starts the cooldown", async () => {
    const user = fakeUser();
    await sendVerificationEmail(user);

    expect(sendEmailVerification).toHaveBeenCalledWith(user);
    expect(getVerificationResendCooldown(user)).toBeGreaterThan(0);
  });

  it("throws a rate-limit error when called again within the cooldown", async () => {
    const user = fakeUser();
    await sendVerificationEmail(user);

    await expect(sendVerificationEmail(user)).rejects.toBeInstanceOf(VerificationRateLimitError);
    expect(sendEmailVerification).toHaveBeenCalledTimes(1);
  });

  it("reports the remaining cooldown on the rate-limit error", async () => {
    const user = fakeUser();
    await sendVerificationEmail(user);

    await expect(sendVerificationEmail(user)).rejects.toMatchObject({
      retryAfterMs: expect.any(Number),
    });
  });

  it("allows a resend once the cooldown has elapsed", async () => {
    const user = fakeUser();
    const start = 1_000_000;
    await sendVerificationEmail(user, start);

    // Simulate the cooldown window having fully elapsed.
    const later = start + VERIFICATION_RESEND_COOLDOWN_MS + 1;
    expect(getVerificationResendCooldown(user, later)).toBe(0);

    await sendVerificationEmail(user, later);
    expect(sendEmailVerification).toHaveBeenCalledTimes(2);
  });

  it("tracks cooldowns independently per user", async () => {
    const first = fakeUser("user-1");
    const second = fakeUser("user-2");

    await sendVerificationEmail(first);
    await expect(sendVerificationEmail(second)).resolves.toBeUndefined();
    expect(sendEmailVerification).toHaveBeenCalledTimes(2);
  });
});

describe("getVerificationResendCooldown", () => {
  beforeEach(() => resetVerificationCooldown());
  afterEach(() => resetVerificationCooldown());

  it("returns 0 for a user who has never sent an email", () => {
    expect(getVerificationResendCooldown(fakeUser("never-sent"))).toBe(0);
  });
});
