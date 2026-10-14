/**
 * Community leaderboard data + share-link helpers.
 *
 * The leaderboard is powered by the public, read-only `waitlistCounts`
 * collection (see `firestore.rules`). It contains only aggregate numbers per
 * community — never individual signups — so it is safe to read from the client.
 *
 * This module is intentionally free of React so the ranking and share-link
 * logic can be unit tested in isolation.
 */

import { collection, getDocs } from "firebase/firestore";

import { getFirebaseFirestore } from "./firebase";
import { getCommunityLabel, ONTARIO_COMMUNITIES } from "./ontario-communities";
import { absoluteUrl } from "./site";

/** Firestore collection holding public, per-community aggregate counts. */
export const WAITLIST_COUNTS_COLLECTION = "waitlistCounts";

/** A single leaderboard row: a community and its total signup count. */
export interface LeaderboardEntry {
    /** Canonical community id. */
    community: string;
    /** Human-readable community label. */
    label: string;
    /** Total number of waitlist signups for the community. */
    count: number;
    /** 1-based rank after sorting by count (descending). */
    rank: number;
}

/**
 * Sort communities by signup count (descending) and assign 1-based ranks.
 *
 * Ties are broken alphabetically by label so the ordering is deterministic and
 * stable across renders. Communities with no signups are included with a count
 * of zero so the leaderboard always renders the full list.
 */
export function rankCommunities(
    counts: ReadonlyMap<string, number>,
): LeaderboardEntry[] {
    const rows = ONTARIO_COMMUNITIES.map((community) => ({
        community: community.id,
        label: community.label,
        count: counts.get(community.id) ?? 0,
    }));

    rows.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        return a.label.localeCompare(b.label);
    });

    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * Fetch aggregate counts from Firestore and return a ranked leaderboard.
 *
 * Reads only the `waitlistCounts` collection. Missing documents are treated as
 * zero so a partially-populated collection still renders a complete list.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    const db = getFirebaseFirestore();
    const snapshot = await getDocs(collection(db, WAITLIST_COUNTS_COLLECTION));

    const counts = new Map<string, number>();
    snapshot.forEach((doc) => {
        const data = doc.data() as { community?: unknown; count?: unknown };
        const community = typeof data.community === "string" ? data.community : doc.id;
        const count = typeof data.count === "number" && Number.isFinite(data.count) ? data.count : 0;
        counts.set(community, count);
    });

    return rankCommunities(counts);
}

/** Find the leaderboard entry for a community id, if present. */
export function findEntry(
    entries: readonly LeaderboardEntry[],
    communityId: string | null | undefined,
): LeaderboardEntry | undefined {
    if (!communityId) {
        return undefined;
    }
    return entries.find((entry) => entry.community === communityId);
}

/**
 * Build the public share URL for a community.
 *
 * Points at the waitlist page with a `?ref=<community>` param so signups that
 * arrive via the link are attributed to the sharing community. The origin is
 * resolved at runtime (see `absoluteUrl`) so shared links always point at the
 * domain the app is actually served from rather than a hardcoded production
 * host.
 */
export function buildShareUrl(communityId: string): string {
    return absoluteUrl(`/waitlist?ref=${encodeURIComponent(communityId)}`);
}

/** Pre-filled share text inviting others to join the community's waitlist. */
export function buildShareText(communityId: string): string {
    const label = getCommunityLabel(communityId);
    return `I just joined the Parade waitlist for ${label}. Parade connects single mothers in Ontario who want to co-parent and co-habitate. Join us:`;
}

/** A named social share target with a ready-to-use URL. */
export interface ShareTarget {
    id: "x" | "facebook" | "whatsapp";
    label: string;
    href: string;
}

/**
 * Build the list of social share links for a community.
 *
 * Each target receives the share URL and text via its standard query params.
 * `navigator.share`/clipboard copy are handled by the component, not here.
 */
export function buildShareTargets(communityId: string): ShareTarget[] {
    const url = buildShareUrl(communityId);
    const text = buildShareText(communityId);
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    return [
        {
            id: "x",
            label: "Share on X",
            href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        },
        {
            id: "facebook",
            label: "Share on Facebook",
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        },
        {
            id: "whatsapp",
            label: "Share on WhatsApp",
            href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
        },
    ];
}
