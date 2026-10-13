"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FormField } from "@/components/auth/FormField";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import formStyles from "@/components/auth/AuthForm.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAuthErrorMessage, signUpWithEmail } from "@/lib/auth";
import { isValid, validateRegisterForm, type FieldErrors } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      await signUpWithEmail(email.trim(), password, displayName.trim());
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

        <OAuthButtons onSuccess={() => router.push("/")} onError={setFormError} />

        <p className={formStyles.footer}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
