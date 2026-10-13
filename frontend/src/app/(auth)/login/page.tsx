"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { FormField } from "@/components/auth/FormField";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import formStyles from "@/components/auth/AuthForm.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAuthErrorMessage, signInWithEmail } from "@/lib/auth";
import { isValid, validateLoginForm, type FieldErrors } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reactively redirect once a user is signed in. This covers the post-submit
  // case, OAuth sign-in, and visiting /login while already authenticated — and
  // does not depend on the imperative push winning a race with the auth
  // listener (which is unreliable on a static export).
  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validation = validateLoginForm({ email, password });
    setErrors(validation);
    if (!isValid(validation)) {
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
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
        <h1>Welcome back</h1>
        <p>Sign in to continue to Parade.</p>

        {formError ? (
          <p className={formStyles.alert} role="alert">
            {formError}
          </p>
        ) : null}

        <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
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
            autoComplete="current-password"
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" className={formStyles.submit} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className={formStyles.divider}>or</div>

        <OAuthButtons onError={setFormError} />

        <p className={formStyles.footer}>
          Don&#39;t have an account? <Link href="/register">Create one</Link>
        </p>
      </Card>
    </div>
  );
}
