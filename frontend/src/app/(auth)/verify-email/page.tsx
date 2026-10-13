"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import formStyles from "@/components/auth/AuthForm.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getAuthErrorMessage,
  getVerificationResendCooldown,
  sendVerificationEmail,
  VerificationRateLimitError,
} from "@/lib/auth";

/** Format a millisecond duration as a whole number of seconds, rounded up. */
function toSeconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, emailVerified, reloadUser } = useAuth();

  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect signed-out users to login; verified users into the app.
  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (emailVerified) {
      router.replace("/");
    }
  }, [loading, user, emailVerified, router]);

  // Seed the cooldown from any in-flight resend (e.g. after a page refresh).
  useEffect(() => {
    if (user) {
      setCooldownMs(getVerificationResendCooldown(user));
    }
  }, [user]);

  // Tick the cooldown down to zero once per second while it is active.
  useEffect(() => {
    if (cooldownMs <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldownMs((current) => Math.max(0, current - 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownMs]);

  const handleResend = useCallback(async () => {
    if (!user) {
      return;
    }
    setError(null);
    setStatus(null);
    setResending(true);
    try {
      await sendVerificationEmail(user);
      setCooldownMs(getVerificationResendCooldown(user));
      setStatus("Verification email sent. Check your inbox (and spam folder).");
    } catch (err) {
      if (err instanceof VerificationRateLimitError) {
        setCooldownMs(err.retryAfterMs);
        setError("Please wait before requesting another email.");
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setResending(false);
    }
  }, [user]);

  const handleCheckVerified = useCallback(async () => {
    setError(null);
    setStatus(null);
    setChecking(true);
    try {
      const refreshed = await reloadUser();
      if (refreshed?.emailVerified) {
        setStatus("Email verified! Taking you in…");
        router.replace("/");
      } else {
        setError("We couldn't confirm verification yet. Click the link in your email, then try again.");
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }, [reloadUser, router]);

  // Avoid rendering the gate while auth state resolves or a redirect is pending.
  if (loading || !user || emailVerified) {
    return null;
  }

  const cooldownSeconds = toSeconds(cooldownMs);
  const resendDisabled = resending || cooldownSeconds > 0;

  return (
    <div className="stack">
      <Card>
        <h1>Verify your email</h1>
        <p>
          We sent a verification link to <strong>{user.email}</strong>. Click it to activate your
          account.
        </p>

        {status ? (
          <p className={formStyles.alert} role="status">
            {status}
          </p>
        ) : null}

        {error ? (
          <p className={formStyles.alert} role="alert">
            {error}
          </p>
        ) : null}

        <div className={formStyles.form}>
          <Button
            type="button"
            className={formStyles.submit}
            onClick={handleCheckVerified}
            disabled={checking}
          >
            {checking ? "Checking…" : "I've verified my email"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className={formStyles.submit}
            onClick={handleResend}
            disabled={resendDisabled}
          >
            {resending
              ? "Sending…"
              : cooldownSeconds > 0
                ? `Resend in ${cooldownSeconds}s`
                : "Resend verification email"}
          </Button>
        </div>

        <p className={formStyles.footer}>
          Wrong address? <Link href="/register">Use a different email</Link>
        </p>
      </Card>
    </div>
  );
}
