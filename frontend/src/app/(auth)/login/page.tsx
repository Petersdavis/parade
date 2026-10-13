"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FormField } from "@/components/auth/FormField";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import formStyles from "@/components/auth/AuthForm.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAuthErrorMessage, signInWithEmail } from "@/lib/auth";
import { isValid, validateLoginForm, type FieldErrors } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      router.push("/");
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
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

        <OAuthButtons onSuccess={() => router.push("/")} onError={setFormError} />

        <p className={formStyles.footer}>
          Don&#39;t have an account? <Link href="/register">Create one</Link>
        </p>
      </Card>
    </div>
  );
}
