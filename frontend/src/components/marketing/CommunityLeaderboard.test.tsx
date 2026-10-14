import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommunityLeaderboard } from "./CommunityLeaderboard";

const fetchLeaderboard = vi.fn();

vi.mock("@/lib/leaderboard", async () => {
    const actual = await vi.importActual<typeof import("@/lib/leaderboard")>("@/lib/leaderboard");
    return {
        ...actual,
        fetchLeaderboard: (...args: unknown[]) => fetchLeaderboard(...args),
    };
});

const RANKED = [
    { community: "ottawa", label: "Ottawa", count: 12, rank: 1 },
    { community: "peel", label: "Peel Region", count: 8, rank: 2 },
    { community: "toronto", label: "Toronto", count: 5, rank: 3 },
];

describe("CommunityLeaderboard", () => {
    beforeEach(() => {
        fetchLeaderboard.mockReset();
    });

    it("shows a loading state before counts resolve", () => {
        fetchLeaderboard.mockReturnValue(new Promise(() => { }));
        render(<CommunityLeaderboard />);
        expect(screen.getByText(/loading the community leaderboard/i)).toBeInTheDocument();
    });

    it("renders communities ranked by signup count", async () => {
        fetchLeaderboard.mockResolvedValue(RANKED);
        render(<CommunityLeaderboard />);

        const items = await screen.findAllByRole("listitem");
        expect(items[0]).toHaveTextContent("Ottawa");
        expect(items[0]).toHaveTextContent("12 signups");
        expect(items[1]).toHaveTextContent("Peel Region");
    });

    it("highlights the user's community with its rank and count", async () => {
        fetchLeaderboard.mockResolvedValue(RANKED);
        render(<CommunityLeaderboard highlightCommunity="peel" />);

        // The highlight summary shows the rank and count for the joined community.
        const summary = await screen.findByRole("status");
        expect(summary).toHaveTextContent("#2");
        expect(summary).toHaveTextContent("Peel Region");
        expect(summary).toHaveTextContent("8 signups");
        // The matching list row is marked as the current item.
        const current = screen.getByRole("listitem", { current: true });
        expect(current).toHaveTextContent("Peel Region");
    });

    it("renders share actions for the highlighted community", async () => {
        fetchLeaderboard.mockResolvedValue(RANKED);
        render(<CommunityLeaderboard highlightCommunity="ottawa" />);

        expect(await screen.findByRole("link", { name: /share on x/i })).toHaveAttribute(
            "href",
            expect.stringContaining("twitter.com"),
        );
        expect(screen.getByRole("link", { name: /share on facebook/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /share on whatsapp/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
    });

    it("copies the share link to the clipboard", async () => {
        const user = userEvent.setup();
        const writeText = vi.fn().mockResolvedValue(undefined);
        // `navigator.clipboard` is a getter-only property in jsdom, so it must be
        // replaced with defineProperty rather than assigned.
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText },
        });

        fetchLeaderboard.mockResolvedValue(RANKED);
        render(<CommunityLeaderboard highlightCommunity="ottawa" />);

        await user.click(await screen.findByRole("button", { name: /copy link/i }));

        await waitFor(() => {
            expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/waitlist?ref=ottawa"));
        });
        expect(await screen.findByRole("button", { name: /link copied/i })).toBeInTheDocument();
    });

    it("shows an error state with a retry action when loading fails", async () => {
        fetchLeaderboard.mockRejectedValueOnce(new Error("network"));
        render(<CommunityLeaderboard />);

        expect(await screen.findByRole("alert")).toHaveTextContent(/could not load the leaderboard/i);

        fetchLeaderboard.mockResolvedValueOnce(RANKED);
        await userEvent.click(screen.getByRole("button", { name: /try again/i }));

        expect(await screen.findByText(/Ottawa/)).toBeInTheDocument();
    });

    it("shows an empty state when there are no communities", async () => {
        fetchLeaderboard.mockResolvedValue([]);
        render(<CommunityLeaderboard />);

        expect(await screen.findByText(/no signups yet/i)).toBeInTheDocument();
    });
});
