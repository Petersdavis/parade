import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./page";

const push = vi.fn();
const signInWithEmail = vi.fn();
const signInWithGoogle = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
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
    push.mockReset();
    signInWithEmail.mockReset();
    signInWithGoogle.mockReset();
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

  it("submits valid credentials and redirects home", async () => {
    const user = userEvent.setup();
    signInWithEmail.mockResolvedValue({ user: { uid: "abc" } });
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "longenough");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith("jane@example.com", "longenough");
    });
    expect(push).toHaveBeenCalledWith("/");
  });

  it("surfaces a friendly message when sign-in fails", async () => {
    const user = userEvent.setup();
    signInWithEmail.mockRejectedValue({ code: "auth/invalid-credential" });
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect email or password/i);
    expect(push).not.toHaveBeenCalled();
  });

  it("signs in with Google and redirects home", async () => {
    const user = userEvent.setup();
    signInWithGoogle.mockResolvedValue({ user: { uid: "abc" } });
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/");
  });
});
