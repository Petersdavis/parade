import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RegisterPage from "./page";

const replace = vi.fn();
const signUpWithEmail = vi.fn();
const signInWithGoogle = vi.fn();
const sendVerificationEmail = vi.fn();
const useAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    signUpWithEmail: (...args: unknown[]) => signUpWithEmail(...args),
    signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
    sendVerificationEmail: (...args: unknown[]) => sendVerificationEmail(...args),
  };
});

describe("RegisterPage", () => {
  beforeEach(() => {
    replace.mockReset();
    signUpWithEmail.mockReset();
    signInWithGoogle.mockReset();
    sendVerificationEmail.mockReset();
    sendVerificationEmail.mockResolvedValue(undefined);
    useAuth.mockReset();
    // Default: signed out, auth state resolved.
    useAuth.mockReturnValue({ user: null, loading: false, emailVerified: false });
  });

  it("renders the registration form", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("shows validation errors and does not submit an invalid form", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(signUpWithEmail).not.toHaveBeenCalled();
  });

  it("reports mismatched passwords", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^name$/i), "Jane");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "longenough");
    await user.type(screen.getByLabelText(/confirm password/i), "different");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(signUpWithEmail).not.toHaveBeenCalled();
  });

  it("submits a valid form, sends a verification email, and lets the auth listener redirect", async () => {
    const user = userEvent.setup();
    const createdUser = { uid: "abc" };
    signUpWithEmail.mockResolvedValue({ user: createdUser });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^name$/i), "Jane");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "longenough");
    await user.type(screen.getByLabelText(/confirm password/i), "longenough");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(signUpWithEmail).toHaveBeenCalledWith("jane@example.com", "longenough", "Jane");
    });
    await waitFor(() => {
      expect(sendVerificationEmail).toHaveBeenCalledWith(createdUser);
    });
    // The redirect is driven by auth state, not an imperative push.
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects unverified users to the verification gate", () => {
    useAuth.mockReturnValue({ user: { uid: "abc" }, loading: false, emailVerified: false });
    render(<RegisterPage />);

    expect(replace).toHaveBeenCalledWith("/verify-email");
  });

  it("redirects verified users home", () => {
    useAuth.mockReturnValue({ user: { uid: "abc" }, loading: false, emailVerified: true });
    render(<RegisterPage />);

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("does not redirect while auth state is still loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true, emailVerified: false });
    render(<RegisterPage />);

    expect(replace).not.toHaveBeenCalled();
  });

  it("surfaces a friendly message when sign-up fails", async () => {
    const user = userEvent.setup();
    signUpWithEmail.mockRejectedValue({ code: "auth/email-already-in-use" });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^name$/i), "Jane");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "longenough");
    await user.type(screen.getByLabelText(/confirm password/i), "longenough");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
    expect(replace).not.toHaveBeenCalled();
  });

  it("signs in with Google and lets the auth listener redirect", async () => {
    const user = userEvent.setup();
    signInWithGoogle.mockResolvedValue({ user: { uid: "abc" } });
    render(<RegisterPage />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });
});
