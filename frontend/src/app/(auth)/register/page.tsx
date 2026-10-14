"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { FormField } from "@/components/auth/FormField";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import formStyles from "@/components/auth/AuthForm.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAuthErrorMessage, sendVerificationEmail, signUpWithEmail } from "@/lib/auth";
import { isCanonicalCommunityId } from "@/lib/ontario-communities";
import { isValid, validateRegisterForm, type FieldErrors } from "@/lib/validation";

/**
 * Registration entry point for the waitlist workflow.
 *
 * Wrapped in a Suspense boundary because it reads the `?ref=` referral param via
 * `useSearchParams`, which requires one during static export.
 */
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Carry a valid referral community through to the profile step.
  const ref = searchParams.get("ref");
  const referralCommunity = ref && isCanonicalCommunityId(ref) ? ref : null;
  const profileHref = referralCommunity
    ? `/profile?ref=${encodeURIComponent(referralCommunity)}`
    : "/profile";

  // Reactively redirect once a user is signed in. This covers the post-submit
  // case, OAuth sign-in, and visiting /register while already authenticated —
  // and does not depend on the imperative push winning a race with the auth
  // listener (which is unreliable on a static export).
  //
  // New users continue into the waitlist workflow: the basic profile step, then
  // the community leaderboard. The profile page itself skips ahead to the
  // leaderboard when the profile is already complete, so returning users are
  // handled there rather than here.
  useEffect(() => {
    if (!loading && user) {
      router.replace(profileHref);
    }
  }, [loading, user, router, profileHref]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validation = validateRegisterForm({ displayName, email, password, confirmPassword });
    setErrors(validation);
    if (!isValid(validation)) {
      return;
    }

    setSubmitting(true);
    try {
      const credential = await signUpWithEmail(email.trim(), password, displayName.trim());
      // Fire the verification email immediately after registration. A failure
      // here must not block the flow — the user can resend from /verify-email.
      try {
        await sendVerificationEmail(credential.user);
      } catch (error) {
        console.error("Failed to send verification email", error);
      }
      // The auth listener above performs the redirect; keep the button in its
      // pending state until navigation occurs.
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <Card>
        <h1>Create your account</h1>
        <p>Join Parade to find a co-parenting and co-habitation match.</p>

        {formError ? (
          <p className={formStyles.alert} role="alert">
            {formError}
          </p>
        ) : null}

        <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
          <FormField
            label="Name"
            name="displayName"
            autoComplete="name"
            value={displayName}
            error={errors.displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" className={formStyles.submit} disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <div className={formStyles.divider}>or</div>

        <OAuthButtons onError={setFormError} />

        <p className={formStyles.footer}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
