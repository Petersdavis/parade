import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WaitlistForm } from "./WaitlistForm";

const submitWaitlistSignup = vi.fn();

vi.mock("@/lib/waitlist", async () => {
    const actual = await vi.importActual<typeof import("@/lib/waitlist")>("@/lib/waitlist");
    return {
        ...actual,
        submitWaitlistSignup: (...args: unknown[]) => submitWaitlistSignup(...args),
    };
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^name$/i), "Jane Doe");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    const community = screen.getByRole("combobox", { name: /community/i });
    await user.type(community, "Ottawa");
    await user.click(await screen.findByRole("option", { name: "Ottawa" }));
}

describe("WaitlistForm", () => {
    beforeEach(() => {
        submitWaitlistSignup.mockReset();
    });

    it("renders name, email, and community fields", () => {
        render(<WaitlistForm />);
        expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
        expect(screen.getByRole("combobox", { name: /community/i })).toBeInTheDocument();
    });

    it("shows inline errors and does not submit an invalid form", async () => {
        const user = userEvent.setup();
        render(<WaitlistForm />);

        await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

        expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/please choose your community/i)).toBeInTheDocument();
        expect(submitWaitlistSignup).not.toHaveBeenCalled();
    });

    it("rejects a community that is not in the canonical list", async () => {
        const user = userEvent.setup();
        render(<WaitlistForm />);

        await user.type(screen.getByLabelText(/^name$/i), "Jane Doe");
        await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
        // Typing free text that does not match a canonical option clears the
        // selection, so the form reports the community as missing.
        await user.type(screen.getByRole("combobox", { name: /community/i }), "Atlantis");
        await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

        expect(await screen.findByText(/please choose your community/i)).toBeInTheDocument();
        expect(submitWaitlistSignup).not.toHaveBeenCalled();
    });

    it("submits a valid signup and shows the confirmation state", async () => {
        const user = userEvent.setup();
        submitWaitlistSignup.mockResolvedValue({ status: "created" });
        const onSuccess = vi.fn();
        render(<WaitlistForm onSuccess={onSuccess} />);

        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

        await waitFor(() => {
            expect(submitWaitlistSignup).toHaveBeenCalledWith({
                name: "Jane Doe",
                email: "jane@example.com",
                community: "ottawa",
                source: "landing",
                referralCommunity: null,
            });
        });
        expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
        expect(onSuccess).toHaveBeenCalledWith("ottawa");
    });

    it("treats a duplicate signup as success", async () => {
        const user = userEvent.setup();
        submitWaitlistSignup.mockResolvedValue({ status: "duplicate" });
        render(<WaitlistForm />);

        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

        expect(await screen.findByText(/already on the list/i)).toBeInTheDocument();
    });

    it("passes referral metadata through to the signup", async () => {
        const user = userEvent.setup();
        submitWaitlistSignup.mockResolvedValue({ status: "created" });
        render(<WaitlistForm source="leaderboard" referralCommunity="toronto" />);

        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

        await waitFor(() => {
            expect(submitWaitlistSignup).toHaveBeenCalledWith(
                expect.objectContaining({ source: "leaderboard", referralCommunity: "toronto" }),
            );
        });
    });

    it("surfaces a friendly error when the write fails", async () => {
        const user = userEvent.setup();
        submitWaitlistSignup.mockRejectedValue(new Error("network"));
        render(<WaitlistForm />);

        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
    });
});
