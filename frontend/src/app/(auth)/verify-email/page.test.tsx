import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VerifyEmailPage from "./page";

const replace = vi.fn();
const sendVerificationEmail = vi.fn();
const reloadUser = vi.fn();
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
    sendVerificationEmail: (...args: unknown[]) => sendVerificationEmail(...args),
    getVerificationResendCooldown: () => 0,
  };
});

function signedInUnverified() {
  return {
    user: { uid: "abc", email: "jane@example.com", emailVerified: false },
    loading: false,
    emailVerified: false,
    reloadUser,
  };
}

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    replace.mockReset();
    sendVerificationEmail.mockReset();
    reloadUser.mockReset();
    useAuth.mockReset();
    useAuth.mockReturnValue(signedInUnverified());
  });

  it("shows the user's email and verification actions", () => {
    render(<VerifyEmailPage />);

    expect(screen.getByRole("heading", { name: /verify your email/i })).toBeInTheDocument();
    expect(screen.getByText(/jane@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i've verified my email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend verification email/i })).toBeInTheDocument();
  });

  it("redirects signed-out users to login", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      emailVerified: false,
      reloadUser,
    });
    render(<VerifyEmailPage />);

    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("redirects verified users into the app", () => {
    useAuth.mockReturnValue({
      user: { uid: "abc", email: "jane@example.com", emailVerified: true },
      loading: false,
      emailVerified: true,
      reloadUser,
    });
    render(<VerifyEmailPage />);

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("does not redirect while auth state is still loading", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: true,
      emailVerified: false,
      reloadUser,
    });
    render(<VerifyEmailPage />);

    expect(replace).not.toHaveBeenCalled();
  });

  it("resends the verification email and shows a status message", async () => {
    const user = userEvent.setup();
    sendVerificationEmail.mockResolvedValue(undefined);
    render(<VerifyEmailPage />);

    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() => expect(sendVerificationEmail).toHaveBeenCalled());
    expect(await screen.findByRole("status")).toHaveTextContent(/verification email sent/i);
  });

  it("surfaces a friendly message when resend fails", async () => {
    const user = userEvent.setup();
    sendVerificationEmail.mockRejectedValue({ code: "auth/too-many-requests" });
    render(<VerifyEmailPage />);

    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/too many/i);
  });

  it("reports success and redirects when the email is now verified", async () => {
    const user = userEvent.setup();
    reloadUser.mockResolvedValue({ uid: "abc", emailVerified: true });
    render(<VerifyEmailPage />);

    await user.click(screen.getByRole("button", { name: /i've verified my email/i }));

    await waitFor(() => expect(reloadUser).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("shows an error when verification cannot be confirmed yet", async () => {
    const user = userEvent.setup();
    reloadUser.mockResolvedValue({ uid: "abc", emailVerified: false });
    render(<VerifyEmailPage />);

    await user.click(screen.getByRole("button", { name: /i've verified my email/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't confirm/i);
    expect(replace).not.toHaveBeenCalled();
  });
});
