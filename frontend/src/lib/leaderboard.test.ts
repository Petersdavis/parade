import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocs = vi.fn();

vi.mock("firebase/firestore", () => ({
    collection: (_db: unknown, name: string) => ({ name }),
    getDocs: (...args: unknown[]) => getDocs(...args),
}));

vi.mock("./firebase", () => ({
    getFirebaseFirestore: () => ({}),
}));

import {
    buildShareTargets,
    buildShareText,
    buildShareUrl,
    fetchLeaderboard,
    findEntry,
    rankCommunities,
} from "./leaderboard";

/** Build a fake Firestore query snapshot from `[id, data]` pairs. */
function snapshotOf(docs: Array<[string, Record<string, unknown>]>) {
    return {
        forEach: (callback: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
            docs.forEach(([id, data]) => callback({ id, data: () => data }));
        },
    };
}

describe("rankCommunities", () => {
    it("sorts by count descending and assigns 1-based ranks", () => {
        const ranked = rankCommunities(
            new Map([
                ["toronto", 5],
                ["ottawa", 12],
                ["peel", 8],
            ]),
        );

        expect(ranked[0]).toMatchObject({ community: "ottawa", count: 12, rank: 1 });
        expect(ranked[1]).toMatchObject({ community: "peel", count: 8, rank: 2 });
        expect(ranked[2]).toMatchObject({ community: "toronto", count: 5, rank: 3 });
    });

    it("includes communities with no signups at a count of zero", () => {
        const ranked = rankCommunities(new Map());
        expect(ranked).toHaveLength(15);
        expect(ranked.every((entry) => entry.count === 0)).toBe(true);
    });

    it("breaks ties alphabetically by label for deterministic ordering", () => {
        const ranked = rankCommunities(
            new Map([
                ["toronto", 3],
                ["ottawa", 3],
            ]),
        );
        // "Ottawa" sorts before "Toronto" alphabetically.
        expect(ranked[0]?.community).toBe("ottawa");
        expect(ranked[1]?.community).toBe("toronto");
    });

    it("attaches the human-readable label", () => {
        const ranked = rankCommunities(new Map([["simcoe-muskoka", 1]]));
        const entry = ranked.find((row) => row.community === "simcoe-muskoka");
        expect(entry?.label).toBe("Simcoe / Muskoka");
    });
});

describe("fetchLeaderboard", () => {
    beforeEach(() => {
        getDocs.mockReset();
    });

    it("reads aggregate counts and returns a ranked list", async () => {
        getDocs.mockResolvedValue(
            snapshotOf([
                ["toronto", { community: "toronto", count: 4 }],
                ["ottawa", { community: "ottawa", count: 9 }],
            ]),
        );

        const ranked = await fetchLeaderboard();
        expect(ranked[0]).toMatchObject({ community: "ottawa", count: 9, rank: 1 });
    });

    it("falls back to the document id and zero for malformed documents", async () => {
        getDocs.mockResolvedValue(
            snapshotOf([
                ["toronto", { count: "not-a-number" }],
                ["ottawa", { community: "ottawa", count: 2 }],
            ]),
        );

        const ranked = await fetchLeaderboard();
        const toronto = ranked.find((row) => row.community === "toronto");
        expect(toronto?.count).toBe(0);
    });
});

describe("findEntry", () => {
    const entries = rankCommunities(new Map([["ottawa", 3]]));

    it("returns the matching entry", () => {
        expect(findEntry(entries, "ottawa")?.community).toBe("ottawa");
    });

    it("returns undefined for null or unknown communities", () => {
        expect(findEntry(entries, null)).toBeUndefined();
        expect(findEntry(entries, "atlantis")).toBeUndefined();
    });
});

describe("share links", () => {
    it("builds a waitlist URL with the community as a referral param", () => {
        expect(buildShareUrl("ottawa")).toContain("/waitlist?ref=ottawa");
    });

    it("resolves the share URL against the current origin at runtime", () => {
        // jsdom serves the app from localhost; the share link must follow it
        // rather than hardcoding the production domain.
        expect(buildShareUrl("ottawa")).toBe(`${window.location.origin}/waitlist?ref=ottawa`);
    });

    it("does not hardcode the production domain in share links", () => {
        expect(buildShareUrl("ottawa")).not.toContain("parade.app");
    });

    it("includes the community label in the share text", () => {
        expect(buildShareText("ottawa")).toContain("Ottawa");
    });

    it("builds X, Facebook, and WhatsApp share targets with the URL", () => {
        const targets = buildShareTargets("ottawa");
        expect(targets.map((target) => target.id)).toEqual(["x", "facebook", "whatsapp"]);

        const encodedUrl = encodeURIComponent(buildShareUrl("ottawa"));
        const x = targets.find((target) => target.id === "x");
        const facebook = targets.find((target) => target.id === "facebook");
        const whatsapp = targets.find((target) => target.id === "whatsapp");

        expect(x?.href).toContain(encodedUrl);
        expect(facebook?.href).toContain(encodedUrl);
        expect(whatsapp?.href).toContain(encodedUrl);
    });
});
