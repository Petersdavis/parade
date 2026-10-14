"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { FormField } from "@/components/auth/FormField";
import formStyles from "@/components/auth/AuthForm.module.css";
import { CommunityCombobox } from "@/components/marketing/CommunityCombobox";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fetchUserProfile, saveUserProfile } from "@/lib/auth";
import { isCanonicalCommunityId } from "@/lib/ontario-communities";
import { isValid, validateProfileForm, type FieldErrors } from "@/lib/validation";

/**
 * Basic profile step of the waitlist workflow.
 *
 * Reached immediately after registration. Collects first name, last name, email
 * (pre-filled from the auth account when available), and community, then sends
 * the user on to the community leaderboard.
 *
 * Lives in the `(auth)` route group so it is reachable while the user is signed
 * in but has not yet verified their email — verification happens in parallel and
 * is not required to join the waitlist.
 *
 * Wrapped in a Suspense boundary because it reads the `?ref=` referral param via
 * `useSearchParams`, which requires one during static export.
 */
export default function ProfilePage() {
    return (
        <Suspense fallback={null}>
            <ProfileForm />
        </Suspense>
    );
}

function ProfileForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [community, setCommunity] = useState("");
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [checking, setChecking] = useState(true);

    // Pre-select the community from a referral link, if one was supplied.
    const ref = searchParams.get("ref");
    const referralCommunity = ref && isCanonicalCommunityId(ref) ? ref : null;

    // Signed-out visitors have no profile to complete; send them to register.
    useEffect(() => {
        if (!loading && !user) {
            router.replace("/register");
        }
    }, [loading, user, router]);

    // Pre-fill from the auth account and skip ahead when the profile is already
    // complete (e.g. the user navigates back to this page).
    useEffect(() => {
        if (loading || !user) {
            return;
        }

        let cancelled = false;

        async function load() {
            try {
                const profile = await fetchUserProfile(user!);
                if (cancelled) {
                    return;
                }
                if (profile?.profileComplete) {
                    router.replace("/waitlist/leaderboard");
                    return;
                }
                setEmail((current) => current || user!.email || "");
                if (profile?.firstName) {
                    setFirstName(profile.firstName);
                }
                if (profile?.lastName) {
                    setLastName(profile.lastName);
                }
                if (profile?.community) {
                    setCommunity(profile.community);
                } else if (referralCommunity) {
                    // Pre-select the community from a referral link.
                    setCommunity((current) => current || referralCommunity);
                }
            } catch (error) {
                console.error("Failed to load user profile", error);
                if (!cancelled) {
                    setEmail((current) => current || user!.email || "");
                    if (referralCommunity) {
                        setCommunity((current) => current || referralCommunity);
                    }
                }
            } finally {
                if (!cancelled) {
                    setChecking(false);
                }
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [loading, user, router, referralCommunity]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const validation = validateProfileForm(
            { firstName, lastName, email, community },
            isCanonicalCommunityId,
        );
        setErrors(validation);
        if (!isValid(validation)) {
            return;
        }

        if (!user) {
            return;
        }

        setSubmitting(true);
        try {
            await saveUserProfile(user, { firstName, lastName, email, community });
            // The community now lives on the canonical `users/{uid}` document,
            // so the leaderboard reads it from there — no query param needed.
            router.replace("/waitlist/leaderboard");
        } catch (error) {
            console.error("Failed to save user profile", error);
            setFormError("Something went wrong. Please try again.");
            setSubmitting(false);
        }
    }

    if (loading || checking) {
        return (
            <div className="stack">
                <Card>
                    <p role="status">Loading your profile…</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="stack">
            <Card>
                <h1>Tell us about you</h1>
                <p>
                    Just a few details so we can place you in the right community. This takes less than a
                    minute.
                </p>

                {formError ? (
                    <p className={formStyles.alert} role="alert">
                        {formError}
                    </p>
                ) : null}

                <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
                    <FormField
                        label="First name"
                        name="firstName"
                        autoComplete="given-name"
                        value={firstName}
                        error={errors.firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                    <FormField
                        label="Last name"
                        name="lastName"
                        autoComplete="family-name"
                        value={lastName}
                        error={errors.lastName}
                        onChange={(e) => setLastName(e.target.value)}
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
                    <CommunityCombobox value={community} onChange={setCommunity} error={errors.community} />

                    <Button type="submit" className={formStyles.submit} disabled={submitting}>
                        {submitting ? "Saving…" : "Join the waitlist"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
