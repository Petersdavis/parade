"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { isCanonicalCommunityId } from "@/lib/ontario-communities";

/**
 * Forwards the legacy `/waitlist` route into the registration workflow.
 *
 * Any `?ref=` referral community is validated and passed through to `/register`
 * as `?ref=`, so the profile step can pre-select the community the visitor was
 * referred to. Split into its own client component so the page can wrap it in a
 * Suspense boundary — `useSearchParams` requires one during static export.
 */
export function WaitlistRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const ref = searchParams.get("ref");
        const target =
            ref && isCanonicalCommunityId(ref)
                ? `/register?ref=${encodeURIComponent(ref)}`
                : "/register";
        router.replace(target);
    }, [router, searchParams]);

    return (
        <div className="stack">
            <p role="status">Taking you to registration…</p>
        </div>
    );
}
