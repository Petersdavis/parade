import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfilePage from "./page";

const replace = vi.fn();
const fetchUserProfile = vi.fn();
const saveUserProfile = vi.fn();
const useAuth = vi.fn();
const searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace }),
    useSearchParams: () => searchParams,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
    useAuth: () => useAuth(),
}));

vi.mock("@/lib/auth", async () => {
    const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
    return {
        ...actual,
        fetchUserProfile: (...args: unknown[]) => fetchUserProfile(...args),
        saveUserProfile: (...args: unknown[]) => saveUserProfile(...args),
    };
});

const signedInUser = { uid: "abc", email: "jane@example.com" };

describe("ProfilePage", () => {
    beforeEach(() => {
        replace.mockReset();
        fetchUserProfile.mockReset();
        saveUserProfile.mockReset();
        useAuth.mockReset();
        fetchUserProfile.mockResolvedValue(null);
        saveUserProfile.mockResolvedValue(undefined);
        useAuth.mockReturnValue({ user: signedInUser, loading: false });
        for (const key of [...searchParams.keys()]) {
            searchParams.delete(key);
        }
    });

    it("renders the profile form with the email pre-filled from auth", async () => {
        render(<ProfilePage />);

        expect(await screen.findByRole("heading", { name: /tell us about you/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByLabelText(/^email$/i)).toHaveValue("jane@example.com");
        });
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("redirects signed-out visitors to registration", async () => {
        useAuth.mockReturnValue({ user: null, loading: false });
        render(<ProfilePage />);

        await waitFor(() => {
            expect(replace).toHaveBeenCalledWith("/register");
        });
    });

    it("skips ahead to the leaderboard when the profile is already complete", async () => {
        fetchUserProfile.mockResolvedValue({ profileComplete: true });
        render(<ProfilePage />);

        await waitFor(() => {
            expect(replace).toHaveBeenCalledWith("/waitlist/leaderboard");
        });
    });

    it("shows validation errors and does not submit an incomplete form", async () => {
        const user = userEvent.setup();
        render(<ProfilePage />);

        await screen.findByRole("heading", { name: /tell us about you/i });
        await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

        expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/please choose your community/i)).toBeInTheDocument();
        expect(saveUserProfile).not.toHaveBeenCalled();
    });

    it("saves the profile and redirects to the leaderboard for the chosen community", async () => {
        const user = userEvent.setup();
        render(<ProfilePage />);

        await screen.findByRole("heading", { name: /tell us about you/i });
        await user.type(screen.getByLabelText(/first name/i), "Jane");
        await user.type(screen.getByLabelText(/last name/i), "Doe");

        const combobox = screen.getByRole("combobox");
        await user.type(combobox, "Toronto");
        await user.click(await screen.findByRole("option", { name: "Toronto" }));

        await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

        await waitFor(() => {
            expect(saveUserProfile).toHaveBeenCalledWith(
                signedInUser,
                expect.objectContaining({
                    firstName: "Jane",
                    lastName: "Doe",
                    email: "jane@example.com",
                    community: "toronto",
                }),
            );
        });
        await waitFor(() => {
            expect(replace).toHaveBeenCalledWith("/waitlist/leaderboard");
        });
    });

    it("pre-selects the community from a referral link", async () => {
        searchParams.set("ref", "ottawa");
        render(<ProfilePage />);

        await screen.findByRole("heading", { name: /tell us about you/i });
        await waitFor(() => {
            expect(screen.getByRole("combobox")).toHaveValue("Ottawa");
        });
    });

    it("surfaces a friendly error when saving fails", async () => {
        const user = userEvent.setup();
        saveUserProfile.mockRejectedValue(new Error("boom"));
        render(<ProfilePage />);

        await screen.findByRole("heading", { name: /tell us about you/i });
        await user.type(screen.getByLabelText(/first name/i), "Jane");
        await user.type(screen.getByLabelText(/last name/i), "Doe");

        const combobox = screen.getByRole("combobox");
        await user.type(combobox, "Toronto");
        await user.click(await screen.findByRole("option", { name: "Toronto" }));

        await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
        expect(replace).not.toHaveBeenCalled();
    });
});
