import { beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeEmail, waitlistDocId } from "./waitlist";

const txGet = vi.fn();
const txSet = vi.fn();
const txUpdate = vi.fn();
const runTransaction = vi.fn();

vi.mock("firebase/firestore", () => ({
    doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
    runTransaction: (...args: unknown[]) => runTransaction(...args),
    serverTimestamp: () => "SERVER_TIMESTAMP",
}));

vi.mock("./firebase", () => ({
    getFirebaseFirestore: () => ({}),
}));

import { submitWaitlistSignup, WaitlistValidationError } from "./waitlist";

describe("normalizeEmail", () => {
    it("trims and lowercases", () => {
        expect(normalizeEmail("  Jane@Example.COM ")).toBe("jane@example.com");
    });
});

describe("waitlistDocId", () => {
    it("is deterministic and lowercased", () => {
        expect(waitlistDocId("Jane@Example.com")).toBe(waitlistDocId("jane@example.com"));
    });

    it("replaces unsafe characters so the id is Firestore-safe", () => {
        expect(waitlistDocId("a/b@example.com")).not.toContain("/");
    });
});

describe("submitWaitlistSignup", () => {
    beforeEach(() => {
        txGet.mockReset();
        txSet.mockReset();
        txUpdate.mockReset();
        runTransaction.mockReset();
        // Run the transaction callback against a fake transaction object so the
        // read-then-write logic is exercised without a real Firestore.
        runTransaction.mockImplementation(
            async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) =>
                callback({ get: txGet, set: txSet, update: txUpdate }),
        );
    });

    it("rejects a missing name", async () => {
        await expect(
            submitWaitlistSignup({ name: "  ", email: "jane@example.com", community: "toronto" }),
        ).rejects.toBeInstanceOf(WaitlistValidationError);
    });

    it("rejects a non-canonical community", async () => {
        await expect(
            submitWaitlistSignup({ name: "Jane", email: "jane@example.com", community: "atlantis" }),
        ).rejects.toBeInstanceOf(WaitlistValidationError);
    });

    it("creates a signup when the email is new", async () => {
        txGet.mockResolvedValue({ exists: () => false });

        const result = await submitWaitlistSignup({
            name: "Jane",
            email: "Jane@Example.com",
            community: "toronto",
        });

        expect(result).toEqual({ status: "created" });
        expect(txSet).toHaveBeenCalledWith(
            expect.objectContaining({ id: "jane@example.com" }),
            expect.objectContaining({
                email: "jane@example.com",
                name: "Jane",
                community: "toronto",
                source: "landing",
                referralCommunity: null,
            }),
        );
        expect(txUpdate).not.toHaveBeenCalled();
    });

    it("returns duplicate without writing when the email already exists", async () => {
        txGet.mockResolvedValue({ exists: () => true, get: () => "toronto" });

        const result = await submitWaitlistSignup({
            name: "Jane",
            email: "jane@example.com",
            community: "toronto",
        });

        expect(result).toEqual({ status: "duplicate" });
        expect(txSet).not.toHaveBeenCalled();
        expect(txUpdate).not.toHaveBeenCalled();
    });

    it("updates the community on a returning signup that picked a new region", async () => {
        txGet.mockResolvedValue({ exists: () => true, get: () => "toronto" });

        const result = await submitWaitlistSignup({
            name: "Jane",
            email: "jane@example.com",
            community: "ottawa",
        });

        expect(result).toEqual({ status: "duplicate" });
        expect(txSet).not.toHaveBeenCalled();
        expect(txUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: "jane@example.com" }),
            { community: "ottawa" },
        );
    });
});
