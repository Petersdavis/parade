import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGuard } from "./AuthGuard";

const replace = vi.fn();
const fetchUserProfile = vi.fn();
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
    fetchUserProfile: (...args: unknown[]) => fetchUserProfile(...args),
  };
});

const signedInUser = { uid: "abc", email: "jane@example.com", emailVerified: true };

describe("AuthGuard", () => {
  beforeEach(() => {
    replace.mockReset();
    fetchUserProfile.mockReset();
    useAuth.mockReset();
    fetchUserProfile.mockResolvedValue(null);
    useAuth.mockReturnValue({ user: signedInUser, loading: false, emailVerified: true });
  });

  it("renders children for a signed-in user when no profile is required", () => {
    render(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders the fallback while auth state is loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true, emailVerified: false });
    render(
      <AuthGuard fallback={<p>Loading…</p>}>
        <p>Protected content</p>
      </AuthGuard>,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects signed-out visitors to the home page by default", async () => {
    useAuth.mockReturnValue({ user: null, loading: false, emailVerified: false });
    render(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("honours a custom signed-out redirect", async () => {
    useAuth.mockReturnValue({ user: null, loading: false, emailVerified: false });
    render(
      <AuthGuard signedOutRedirect="/login">
        <p>Protected content</p>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  it("allows signed-out visitors through when requireAuth is false", () => {
    useAuth.mockReturnValue({ user: null, loading: false, emailVerified: false });
    render(
      <AuthGuard requireAuth={false}>
        <p>Public content</p>
      </AuthGuard>,
    );

    expect(screen.getByText("Public content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders children when the profile is complete", async () => {
    fetchUserProfile.mockResolvedValue({ profileComplete: true });
    render(
      <AuthGuard requireProfileComplete>
        <p>Protected content</p>
      </AuthGuard>,
    );

    expect(await screen.findByText("Protected content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("passes the loaded profile to a render-prop child", async () => {
    fetchUserProfile.mockResolvedValue({ profileComplete: true, community: "toronto" });
    render(
      <AuthGuard requireProfileComplete>
        {({ profile }) => <p>Community: {profile?.community}</p>}
      </AuthGuard>,
    );

    expect(await screen.findByText("Community: toronto")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to the profile page when the profile is incomplete", async () => {
    fetchUserProfile.mockResolvedValue({ profileComplete: false });
    render(
      <AuthGuard requireProfileComplete>
        <p>Protected content</p>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/profile");
    });
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects to the profile page when no profile document exists", async () => {
    fetchUserProfile.mockResolvedValue(null);
    render(
      <AuthGuard requireProfileComplete>
        <p>Protected content</p>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/profile");
    });
  });

  it("honours a custom incomplete-profile redirect", async () => {
    fetchUserProfile.mockResolvedValue({ profileComplete: false });
    render(
      <AuthGuard requireProfileComplete incompleteProfileRedirect="/onboarding">
        <p>Protected content</p>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("does not enforce verification while requireVerified is inert", () => {
    useAuth.mockReturnValue({
      user: { ...signedInUser, emailVerified: false },
      loading: false,
      emailVerified: false,
    });
    render(
      <AuthGuard requireVerified>
        <p>Protected content</p>
      </AuthGuard>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
