/**
 * Waitlist signup persistence.
 *
 * All writes are client-side (the frontend is a static export). The `waitlist`
 * collection is write-only from the client — see `firestore.rules` — so this
 * module never reads individual signup documents back. Aggregate counts are
 * exposed separately via the `waitlistCounts` collection, which is populated
 * server-side by a Cloud Function.
 *
 * Duplicate prevention: the document id is derived deterministically from the
 * normalized email, so a second signup for the same address targets the same
 * document rather than creating a duplicate. The existence check and the write
 * run in a single transaction so concurrent submits cannot both create the
 * document.
 *
 * Returning signups: when the email already exists we keep the original signup
 * but update its `community` if the user picked a different one. The server
 * counter is reconciled from the document's final state (see
 * `functions/src/waitlist/aggregateCounts.ts`), so a community change is
 * reflected in the leaderboard instead of being silently dropped.
 */

import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

import { getFirebaseFirestore } from "./firebase";
import { isCanonicalCommunityId } from "./ontario-communities";

/** Firestore collection holding one document per waitlist signup. */
export const WAITLIST_COLLECTION = "waitlist";

/** Shape of a `waitlist/{id}` Firestore document. */
export interface WaitlistSignup {
  /** Normalized (lowercased, trimmed) email address. */
  email: string;
  /** Display name as entered by the user. */
  name: string;
  /** Canonical community id (see `ontario-communities.ts`). */
  community: string;
  /** Where the signup came from, e.g. "landing" or "leaderboard". */
  source: string;
  /** Community id of the referrer, when the signup came from a share link. */
  referralCommunity: string | null;
  createdAt: unknown;
}

export interface WaitlistInput {
  name: string;
  email: string;
  community: string;
  /** Optional source label; defaults to "landing". */
  source?: string;
  /** Optional referring community id from a share link. */
  referralCommunity?: string | null;
}

export type WaitlistResult =
  | { status: "created" }
  | { status: "duplicate" };

/** Normalize an email for storage and duplicate detection. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Derive a stable, Firestore-safe document id from an email address.
 *
 * Firestore document ids may not contain "/", so we replace it (and any other
 * unsafe characters) with "_". The result is deterministic, which is what gives
 * us idempotent, duplicate-free signups.
 */
export function waitlistDocId(email: string): string {
  return normalizeEmail(email).replace(/[^a-z0-9@._+-]/g, "_");
}

/** Thrown when a signup is submitted with invalid or non-canonical data. */
export class WaitlistValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WaitlistValidationError";
  }
}

/**
 * Persist a waitlist signup.
 *
 * Returns `{ status: "duplicate" }` when the email has already signed up, and
 * `{ status: "created" }` otherwise. Throws {@link WaitlistValidationError} for
 * invalid input so callers can surface a clear message.
 */
export async function submitWaitlistSignup(input: WaitlistInput): Promise<WaitlistResult> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const community = input.community.trim();

  if (!name) {
    throw new WaitlistValidationError("Name is required.");
  }
  if (!email) {
    throw new WaitlistValidationError("Email is required.");
  }
  if (!isCanonicalCommunityId(community)) {
    throw new WaitlistValidationError("Please choose a community from the list.");
  }

  const db = getFirebaseFirestore();
  const ref = doc(db, WAITLIST_COLLECTION, waitlistDocId(email));

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);

    if (existing.exists()) {
      // Returning signup: keep the original record but move the user to the
      // community they just selected so the server counter can reconcile the
      // change. No-op when the community is unchanged.
      if (existing.get("community") !== community) {
        transaction.update(ref, { community });
      }
      return { status: "duplicate" };
    }

    const signup: WaitlistSignup = {
      email,
      name,
      community,
      source: input.source ?? "landing",
      referralCommunity: input.referralCommunity ?? null,
      createdAt: serverTimestamp(),
    };

    transaction.set(ref, signup);
    return { status: "created" };
  });
}
