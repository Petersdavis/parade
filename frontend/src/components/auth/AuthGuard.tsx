"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { fetchUserProfile, type UserProfile } from "@/lib/auth";

/** Where to send a signed-out visitor. */
export const DEFAULT_SIGNED_OUT_REDIRECT = "/";

/** Where to send a signed-in user who has not completed their profile. */
export const DEFAULT_INCOMPLETE_PROFILE_REDIRECT = "/profile";

/** Where to send a signed-in but unverified user. */
export const DEFAULT_UNVERIFIED_REDIRECT = "/verify-email";

/**
 * Context passed to a render-prop `children` function once the guard's
 * requirements are satisfied. Lets consumers read the canonical user profile
 * (e.g. `community`) without a second Firestore read.
 */
export interface AuthGuardRenderProps {
  /** The signed-in Firebase user. */
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  /**
   * The `users/{uid}` profile document, or null when it was not loaded (i.e.
   * `requireProfileComplete` was not set) or does not exist.
   */
  profile: UserProfile | null;
}

interface AuthGuardProps {
  /**
   * The protected content. May be a render-prop function that receives the
   * resolved {@link AuthGuardRenderProps} (user + profile).
   */
  children: ReactNode | ((props: AuthGuardRenderProps) => ReactNode);
  /**
   * Require a signed-in user. When false the guard only enforces the other
   * constraints for users who happen to be signed in. Defaults to true.
   */
  requireAuth?: boolean;
  /**
   * Require the signed-in user's email to be verified.
   *
   * Reserved for a future verification gate: the option is accepted and
   * threaded through the guard, but it currently has no functional behaviour
   * (an unverified user is not redirected). Flip `enforceVerified` to true to
   * activate it once the product decides verification is mandatory.
   */
  requireVerified?: boolean;
  /**
   * Require the user's `users/{uid}` profile to be complete
   * (`profileComplete === true`). Incomplete profiles are redirected to
   * `incompleteProfileRedirect`.
   */
  requireProfileComplete?: boolean;
  /** Redirect target for signed-out visitors. Defaults to `/`. */
  signedOutRedirect?: string;
  /** Redirect target for signed-in users without a completed profile. */
  incompleteProfileRedirect?: string;
  /** Redirect target for signed-in but unverified users. */
  unverifiedRedirect?: string;
  /** Rendered while auth/profile state resolves. Defaults to null. */
  fallback?: ReactNode;
}

/**
 * Generic client-side route guard that enforces a required auth state.
 *
 * The frontend is a fully static export, so all guarding happens on the client
 * after Firebase resolves the persisted session. The guard:
 *
 *  1. waits for the initial auth state (`loading`);
 *  2. redirects signed-out visitors to `signedOutRedirect` (default `/`) when
 *     `requireAuth` is set;
 *  3. optionally requires a completed profile, redirecting to
 *     `incompleteProfileRedirect` (default `/profile`) when the `users/{uid}`
 *     document is missing or `profileComplete` is not true;
 *  4. optionally requires a verified email (`requireVerified`).
 *
 * While any requirement is unresolved it renders `fallback` (nothing by
 * default) to avoid a flash of protected content or a premature redirect.
 */
export function AuthGuard({
  children,
  requireAuth = true,
  requireVerified = false,
  requireProfileComplete = false,
  signedOutRedirect = DEFAULT_SIGNED_OUT_REDIRECT,
  incompleteProfileRedirect = DEFAULT_INCOMPLETE_PROFILE_REDIRECT,
  unverifiedRedirect = DEFAULT_UNVERIFIED_REDIRECT,
  fallback = null,
}: AuthGuardProps) {
  const { user, loading, emailVerified } = useAuth();
  const router = useRouter();

  // Profile state is only fetched when a completed profile is required.
  const [profileLoading, setProfileLoading] = useState(requireProfileComplete);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Load the profile document once the user is known.
  useEffect(() => {
    if (!requireProfileComplete || loading || !user) {
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    async function load() {
      try {
        const loaded = await fetchUserProfile(user!);
        if (!cancelled) {
          setProfile(loaded);
        }
      } catch (error) {
        console.error("Failed to load user profile for guard", error);
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [requireProfileComplete, loading, user]);

  const profileComplete = profile?.profileComplete === true;

  useEffect(() => {
    if (loading) {
      return;
    }

    if (requireAuth && !user) {
      router.replace(signedOutRedirect);
      return;
    }

    // Reserved: verification gating is intentionally inert for now. When the
    // product decides verification is mandatory, uncomment the block below and
    // add `(requireVerified && !!user && !emailVerified)` to `blocked`.
    //
    // if (requireVerified && user && !emailVerified) {
    //   router.replace(unverifiedRedirect);
    //   return;
    // }

    if (requireProfileComplete && user && !profileLoading && !profileComplete) {
      router.replace(incompleteProfileRedirect);
    }
  }, [
    loading,
    user,
    requireAuth,
    requireVerified,
    emailVerified,
    requireProfileComplete,
    profileLoading,
    profileComplete,
    signedOutRedirect,
    unverifiedRedirect,
    incompleteProfileRedirect,
    router,
  ]);

  const blocked =
    loading ||
    (requireAuth && !user) ||
    (requireProfileComplete && !!user && (profileLoading || !profileComplete));

  if (blocked) {
    return <>{fallback}</>;
  }

  if (typeof children === "function") {
    return <>{children({ user: user!, profile })}</>;
  }

  return <>{children}</>;
}
