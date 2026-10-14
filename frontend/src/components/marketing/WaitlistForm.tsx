"use client";

import { useState, type FormEvent } from "react";

import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/Button";
import { isCanonicalCommunityId } from "@/lib/ontario-communities";
import { isValid, validateWaitlistForm, type FieldErrors } from "@/lib/validation";
import { submitWaitlistSignup } from "@/lib/waitlist";

import { CommunityCombobox } from "./CommunityCombobox";

import styles from "./WaitlistForm.module.css";

interface WaitlistFormProps {
    /** Source label recorded with the signup (e.g. "landing"). */
    source?: string;
    /** Referring community id parsed from a share link, if any. */
    referralCommunity?: string | null;
    /**
     * Called after a successful (or duplicate) signup with the chosen community
     * id, so the parent can reveal the leaderboard.
     */
    onSuccess?: (communityId: string) => void;
}

type FormState = "idle" | "submitting" | "success" | "duplicate";

/**
 * Waitlist signup form: name, email, and community.
 *
 * Validates client-side, persists to Firestore, and renders a friendly
 * confirmation state. Duplicate emails are treated as success (the user is
 * already on the list) rather than an error.
 */
export function WaitlistForm({ source = "landing", referralCommunity = null, onSuccess }: WaitlistFormProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [community, setCommunity] = useState("");
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [state, setState] = useState<FormState>("idle");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const validation = validateWaitlistForm({ name, email, community }, isCanonicalCommunityId);
        setErrors(validation);
        if (!isValid(validation)) {
            return;
        }

        setState("submitting");
        try {
            const result = await submitWaitlistSignup({
                name,
                email,
                community,
                source,
                referralCommunity,
            });
            setState(result.status === "duplicate" ? "duplicate" : "success");
            onSuccess?.(community);
        } catch (error) {
            console.error("Failed to submit waitlist signup", error);
            setFormError("Something went wrong. Please try again.");
            setState("idle");
        }
    }

    if (state === "success" || state === "duplicate") {
        return (
            <div className={styles.confirmation} role="status">
                <h2 className={styles.confirmationHeading}>
                    {state === "duplicate" ? "You're already on the list" : "You're on the list!"}
                </h2>
                <p>
                    {state === "duplicate"
                        ? "We already have a spot saved for you. We'll be in touch as soon as Parade reaches your community."
                        : "Thanks for joining. We'll email you as soon as Parade opens in your community."}
                </p>
            </div>
        );
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {formError ? (
                <p className={styles.alert} role="alert">
                    {formError}
                </p>
            ) : null}

            <FormField
                label="Name"
                name="name"
                autoComplete="name"
                value={name}
                error={errors.name}
                onChange={(event) => setName(event.target.value)}
            />
            <FormField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                error={errors.email}
                onChange={(event) => setEmail(event.target.value)}
            />
            <CommunityCombobox value={community} onChange={setCommunity} error={errors.community} />

            <Button type="submit" className={styles.submit} disabled={state === "submitting"}>
                {state === "submitting" ? "Joining…" : "Join the waitlist"}
            </Button>
        </form>
    );
}
