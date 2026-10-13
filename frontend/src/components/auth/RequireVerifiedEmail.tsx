"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

interface RequireVerifiedEmailProps {
  children: ReactNode;
}

/**
 * Route guard for authenticated, email-verified content.
 *
 * Redirects:
 * - signed-out users to `/login`;
 * - signed-in but unverified users to `/verify-email`.
 *
 * While the initial auth state is resolving it renders nothing to avoid a
 * flash of protected content or a premature redirect.
 */
export function RequireVerifiedEmail({ children }: RequireVerifiedEmailProps) {
  const { user, loading, emailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!emailVerified) {
      router.replace("/verify-email");
    }
  }, [loading, user, emailVerified, router]);

  if (loading || !user || !emailVerified) {
    return null;
  }

  return <>{children}</>;
}
