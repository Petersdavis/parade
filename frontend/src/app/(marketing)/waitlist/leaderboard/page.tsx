import type { Metadata } from "next";
import { Suspense } from "react";

import { Card } from "@/components/ui/Card";
import { canonicalUrl, SITE_DESCRIPTION } from "@/lib/site";

import { LeaderboardView } from "./LeaderboardView";

export const metadata: Metadata = {
    title: "Community leaderboard",
    description: SITE_DESCRIPTION,
    alternates: {
        canonical: canonicalUrl("/waitlist/leaderboard"),
    },
    robots: {
        // The leaderboard is a post-signup conversion page; keep it out of indexes.
        index: false,
    },
};

/**
 * Public community leaderboard page.
 *
 * Ranks Ontario communities by waitlist signups. The signed-in user's own
 * community is read from their canonical `users/{uid}` profile (via
 * `AuthGuard`) and highlighted with its rank and count, along with share
 * actions.
 */
export default function LeaderboardPage() {
    return (
        <div className="stack">
            <Card>
                <h1>Community leaderboard</h1>
                <p>
                    Every signup moves a community closer to launch. Share your link to help yours climb the
                    list.
                </p>
                <Suspense fallback={<p>Loading the community leaderboard…</p>}>
                    <LeaderboardView />
                </Suspense>
            </Card>
        </div>
    );
}
