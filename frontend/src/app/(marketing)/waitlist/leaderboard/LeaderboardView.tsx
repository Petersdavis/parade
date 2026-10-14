"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { CommunityLeaderboard } from "@/components/marketing/CommunityLeaderboard";
import { isCanonicalCommunityId } from "@/lib/ontario-communities";

/**
 * Renders the community leaderboard with the signed-in user's community
 * highlighted.
 *
 * The community is read from the canonical `users/{uid}` profile (via the
 * {@link AuthGuard} render prop) rather than a URL parameter — the profile is
 * the single source of truth for a user's community, so no `?community=` query
 * string is needed.
 *
 * The leaderboard is a post-signup conversion page, so it is gated behind
 * {@link AuthGuard}: signed-out visitors bounce to the home page and signed-in
 * users without a completed profile bounce to the profile step.
 */
export function LeaderboardView() {
    return (
        <AuthGuard
            requireAuth
            requireProfileComplete
            signedOutRedirect="/"
            incompleteProfileRedirect="/profile"
            fallback={<p role="status">Checking your access…</p>}
        >
            {({ profile }) => {
                const community = profile?.community;
                const highlightCommunity =
                    community && isCanonicalCommunityId(community) ? community : null;
                return <CommunityLeaderboard highlightCommunity={highlightCommunity} />;
            }}
        </AuthGuard>
    );
}
