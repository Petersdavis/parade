import type { Metadata } from "next";
import { Suspense } from "react";

import { canonicalUrl, SITE_DESCRIPTION } from "@/lib/site";

import { WaitlistRedirect } from "./WaitlistRedirect";

export const metadata: Metadata = {
    title: "Join the waitlist",
    description: SITE_DESCRIPTION,
    alternates: {
        canonical: canonicalUrl("/waitlist"),
    },
    robots: {
        // The waitlist is a conversion page; keep it out of search indexes.
        index: false,
    },
};

/**
 * Legacy waitlist entry point.
 *
 * The waitlist now runs through the registration workflow (register → profile →
 * leaderboard). This route is kept so existing share links (`/waitlist?ref=…`)
 * keep working: it forwards visitors into registration, carrying the referral
 * community along so it can be applied once they reach the profile step.
 */
export default function WaitlistPage() {
    return (
        <Suspense fallback={null}>
            <WaitlistRedirect />
        </Suspense>
    );
}
