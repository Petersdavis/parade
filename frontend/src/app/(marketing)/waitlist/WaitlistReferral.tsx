"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { CommunityLeaderboard } from "@/components/marketing/CommunityLeaderboard";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { isCanonicalCommunityId } from "@/lib/ontario-communities";

/**
 * Reads the `?ref=` referral community from the URL and passes it to the form.
 *
 * After a successful signup the community leaderboard is revealed inline, with
 * the community the user just joined highlighted and share actions available.
 *
 * Split into its own client component so the page can wrap it in a Suspense
 * boundary — `useSearchParams` requires one during static export.
 */
export function WaitlistReferral() {
    const searchParams = useSearchParams();
    const ref = searchParams.get("ref");
    const referralCommunity = ref && isCanonicalCommunityId(ref) ? ref : null;

    const [joinedCommunity, setJoinedCommunity] = useState<string | null>(null);

    return (
        <div className="stack">
            <WaitlistForm referralCommunity={referralCommunity} onSuccess={setJoinedCommunity} />
            {joinedCommunity ? <CommunityLeaderboard highlightCommunity={joinedCommunity} /> : null}
        </div>
    );
}
