"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
    buildShareTargets,
    buildShareText,
    buildShareUrl,
    fetchLeaderboard,
    findEntry,
    type LeaderboardEntry,
} from "@/lib/leaderboard";

import styles from "./CommunityLeaderboard.module.css";

interface CommunityLeaderboardProps {
    /** Community the user just joined; highlighted in the list. */
    highlightCommunity?: string | null;
}

const WAITLIST_CAP = 250;

type LoadState = "loading" | "ready" | "error";

/**
 * Public community leaderboard.
 *
 * Ranks Ontario communities by waitlist signups (aggregate counts only — see
 * `lib/leaderboard.ts`). Highlights the community the user selected and offers
 * share actions that attribute new signups back to that community.
 */
export function CommunityLeaderboard({ highlightCommunity = null }: CommunityLeaderboardProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [state, setState] = useState<LoadState>("loading");
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        setState("loading");
        try {
            const ranked = await fetchLeaderboard();
            setEntries(ranked);
            setState("ready");
        } catch (error) {
            console.error("Failed to load leaderboard", error);
            setState("error");
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const highlighted = useMemo(
        () => findEntry(entries, highlightCommunity),
        [entries, highlightCommunity],
    );

    const shareTargets = useMemo(
        () => (highlightCommunity ? buildShareTargets(highlightCommunity) : []),
        [highlightCommunity],
    );

    const handleCopy = useCallback(async () => {
        if (!highlightCommunity) {
            return;
        }
        const url = buildShareUrl(highlightCommunity);
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy share link", error);
        }
    }, [highlightCommunity]);

    if (state === "loading") {
        return (
            <div className={styles.panel} role="status" aria-live="polite">
                <p className={styles.muted}>Loading the community leaderboard…</p>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className={styles.panel} role="alert">
                <p className={styles.muted}>We could not load the leaderboard right now.</p>
                <Button type="button" variant="secondary" onClick={() => void load()}>
                    Try again
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <h2 className={styles.heading}>Community Leaderboard</h2>
            <p className={styles.intro}>
                Every signup moves a community closer to launch. Share your link to help yours climb the list.
            </p>

            {entries.length === 0 ? (
                <p className={styles.muted}>No signups yet — be the first in your community.</p>
            ) : (
                <ol className={styles.list}>
                    {entries.map((entry) => {
                        const isHighlighted = entry.community === highlightCommunity;
                        const filled = Math.min(100, (entry.count / WAITLIST_CAP) * 100);
                        const isComingSoon = entry.count >= WAITLIST_CAP;
                        return (
                            <li
                                key={entry.community}
                                className={isHighlighted ? `${styles.row} ${styles.rowHighlighted}` : styles.row}
                                aria-current={isHighlighted ? "true" : undefined}
                            >
                                <div className={styles.rowHeader}>
                                    <span className={styles.rank}>{entry.rank}</span>
                                    <span className={styles.label}>{entry.label}</span>
                                    <div
                                        className={styles.progressTrack}
                                        role="progressbar"
                                        title={`${entry.count} / ${WAITLIST_CAP} signups`}
                                        aria-label={`${entry.label}: ${entry.count} / ${WAITLIST_CAP} signups`}
                                        aria-valuemin={0}
                                        aria-valuemax={WAITLIST_CAP}
                                        aria-valuenow={Math.min(entry.count, WAITLIST_CAP)}
                                    >
                                        <div className={styles.progressFill} style={{ width: `${filled}%` }} />
                                    </div>
                                </div>
                                {isComingSoon ? <span className={styles.badge}>Coming soon!</span> : null}
                            </li>
                        );
                    })}
                </ol>
            )}

            {highlightCommunity ? (
                <div className={styles.share}>
                    <h3 className={styles.shareHeading}>Invite others to {highlighted?.label ?? "your community"}</h3>
                    <p className={styles.muted}>{buildShareText(highlightCommunity)}</p>
                    <div className={styles.shareActions}>
                        {shareTargets.map((target) => (
                            <a
                                key={target.id}
                                className={styles.shareLink}
                                href={target.href}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {target.label}
                            </a>
                        ))}
                        <button type="button" className={styles.copyButton} onClick={() => void handleCopy()}>
                            {copied ? "Link copied!" : "Copy link"}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
