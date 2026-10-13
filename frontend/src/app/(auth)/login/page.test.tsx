import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./page";

const replace = vi.fn();
const signInWithEmail = vi.fn();
const signInWithGoogle = vi.fn();
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
    signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
    signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
  };
});

describe("LoginPage", () => {
  beforeEach(() => {
    replace.mockReset();
    signInWithEmail.mockReset();
    signInWithGoogle.mockReset();
    useAuth.mockReset();
    // Default: signed out, auth state resolved.
    useAuth.mockReturnValue({ user: null, loading: false });
  });

  it("renders the login form", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("shows validation errors and does not submit an invalid form", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(signInWithEmail).not.toHaveBeenCalled();
  });

  it("submits valid credentials and lets the auth listener redirect", async () => {
    const user = userEvent.setup();
    signInWithEmail.mockResolvedValue({ user: { uid: "abc" } });
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "longenough");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith("jane@example.com", "longenough");
    });
    // The redirect is driven by auth state, not an imperative push.
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects home once the auth state reports a signed-in user", () => {
    useAuth.mockReturnValue({ user: { uid: "abc" }, loading: false });
    render(<LoginPage />);

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("does not redirect while auth state is still loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<LoginPage />);

    expect(replace).not.toHaveBeenCalled();
  });

  it("surfaces a friendly message when sign-in fails", async () => {
    const user = userEvent.setup();
    signInWithEmail.mockRejectedValue({ code: "auth/invalid-credential" });
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect email or password/i);
    expect(replace).not.toHaveBeenCalled();
  });

  it("signs in with Google and lets the auth listener redirect", async () => {
    const user = userEvent.setup();
    signInWithGoogle.mockResolvedValue({ user: { uid: "abc" } });
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });
});
