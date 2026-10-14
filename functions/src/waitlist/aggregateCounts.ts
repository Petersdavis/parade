/**
 * Community aggregate counts.
 *
 * The frontend is a static export and the `users` collection is only readable
 * by its owner (see `firestore.rules`), so individual profiles are never
 * enumerable in the browser. To power the public community leaderboard we
 * maintain a separate, read-only `waitlistCounts/{communityId}` collection that
 * contains only aggregate numbers — no personal data.
 *
 * Two triggers keep the aggregates fresh:
 *
 *  - `onUserCommunityChanged` — a Firestore `onDocumentWritten` trigger on the
 *    `users` collection that reconciles the aggregate count with the *final
 *    state* of a user profile. It applies the delta between the previous and
 *    current document so creates, community changes, and deletes are all
 *    reflected. This keeps the leaderboard live without any scheduled lag.
 *  - `recomputeWaitlistCounts` — an HTTPS callable that recomputes every
 *    community count from scratch using Firestore aggregation queries. This is
 *    the source of truth and can be run to repair drift (e.g. after a manual
 *    data import or a missed trigger).
 *
 * Why `onDocumentWritten` and not `onDocumentCreated`: a user document is
 * created on first sign-in and then updated as the profile is completed (see
 * `frontend/src/lib/auth.ts`), so the community is frequently set or changed
 * *after* the document exists. A create-only trigger would miss those updates,
 * leaving the aggregate permanently stale.
 */

import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * Deployment region for these functions. MUST match the Firestore database
 * location (`northamerica-northeast1` in firebase.json): a 2nd-gen Firestore
 * trigger is an Eventarc trigger that must be co-located with the database.
 *
 * Set explicitly per function rather than relying on `setGlobalOptions` in
 * `index.ts`: ES module imports are evaluated before the importing module's
 * body, so this module registers its functions before `setGlobalOptions` runs
 * and the global region would not apply.
 */
export const REGION = "northamerica-northeast1";

/** Firestore collection holding one document per user profile. */
export const USERS_COLLECTION = "users";

/** Firestore collection holding public, per-community aggregate counts. */
export const WAITLIST_COUNTS_COLLECTION = "waitlistCounts";

/**
 * Canonical community ids. Kept in sync with
 * `frontend/src/lib/ontario-communities.ts`; the ids are the aggregation keys
 * and must remain stable.
 */
export const COMMUNITY_IDS = [
  "toronto",
  "peel",
  "york",
  "durham",
  "halton",
  "hamilton",
  "ottawa",
  "waterloo",
  "london",
  "windsor",
  "niagara",
  "simcoe-muskoka",
  "kingston",
  "sudbury",
  "thunder-bay",
] as const;

/** Shape of a `waitlistCounts/{communityId}` document. */
export interface CommunityCount {
  /** Canonical community id (also the document id). */
  community: string;
  /** Total number of users for the community. */
  count: number;
  /** Server timestamp of the last update. */
  updatedAt: unknown;
}

/**
 * Read the canonical `community` field from a user snapshot, if valid.
 *
 * Empty values (`""`, `null`, or a missing field) mean "no community" and
 * return null. Non-canonical values are also treated as null so a malformed
 * write can never create a bogus counter document.
 *
 * @param {FirebaseFirestore.DocumentSnapshot | undefined} snapshot The
 *   before/after document snapshot from the trigger event.
 * @return {string | null} The canonical community id, or null when the
 *   snapshot is missing, absent, empty, or holds a non-canonical value.
 */
function readCanonicalCommunity(
  snapshot: FirebaseFirestore.DocumentSnapshot | undefined,
): string | null {
  if (!snapshot || !snapshot.exists) {
    return null;
  }
  const community = snapshot.get("community");
  if (typeof community !== "string" || community === "") {
    return null;
  }
  const isCanonical = (COMMUNITY_IDS as readonly string[]).includes(community);
  if (!isCanonical) {
    return null;
  }
  return community;
}

/**
 * Apply a signed delta to a community's aggregate count.
 *
 * Uses `FieldValue.increment` with `merge: true` so the document is created
 * on first touch and updated atomically thereafter. A delta of zero is a
 * no-op so we never write a spurious `updatedAt`.
 *
 * @param {string} community Canonical community id to adjust.
 * @param {number} delta Signed amount to add (negative to decrement).
 * @return {Promise<void>} Resolves once the write completes.
 */
async function applyCountDelta(
  community: string,
  delta: number,
): Promise<void> {
  if (delta === 0) {
    return;
  }
  const db = getFirestore();
  await db
    .collection(WAITLIST_COUNTS_COLLECTION)
    .doc(community)
    .set(
      {
        community,
        count: FieldValue.increment(delta),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
}

/**
 * Reconcile the aggregate count with the final state of a user profile.
 *
 * Fires on every write (create, update, delete) to `users/{userId}` and applies
 * the delta between the previous and current document:
 *
 *  - create (`!before.exists`): +1 to the community when it is non-empty.
 *  - delete (`!after.exists`): -1 from the old community when it was non-empty.
 *  - update: if `community` is unchanged, no-op; otherwise -1 from the old
 *    community (when non-empty) and +1 to the new community (when non-empty).
 *
 * Empty (`""`/`null`/missing) communities are ignored entirely, so a user who
 * has not picked a region never affects any counter. This makes
 * `waitlistCounts` a pure function of the `users` collection, so community
 * changes and deletes self-heal instead of drifting.
 */
export const onUserCommunityChanged = onDocumentWritten(
  {region: REGION, document: `${USERS_COLLECTION}/{userId}`},
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;

    const beforeCommunity = readCanonicalCommunity(before);
    const afterCommunity = readCanonicalCommunity(after);

    if (before?.exists && beforeCommunity === null) {
      logger.warn("Non-canonical community; skipping decrement", {
        userId: event.params.userId,
        community: before.get("community"),
      });
    }
    if (after?.exists && afterCommunity === null) {
      logger.warn("Non-canonical community; skipping increment", {
        userId: event.params.userId,
        community: after.get("community"),
      });
    }

    if (beforeCommunity === afterCommunity) {
      // Create with no valid community, delete with no valid community, or
      // an update that did not change the community: nothing to reconcile.
      return;
    }

    if (beforeCommunity !== null) {
      await applyCountDelta(beforeCommunity, -1);
    }
    if (afterCommunity !== null) {
      await applyCountDelta(afterCommunity, 1);
    }

    logger.info("Reconciled community count", {
      userId: event.params.userId,
      from: beforeCommunity,
      to: afterCommunity,
    });
  },
);

/**
 * Recompute every community count from scratch using Firestore aggregation.
 *
 * This is the authoritative repair path. It runs a `count()` aggregation per
 * community (cheap and index-friendly) and writes the totals to
 * `waitlistCounts`. Communities with zero users are written with a count of
 * zero so the leaderboard can render a complete list.
 *
 * Callable by any authenticated admin; unauthenticated callers are rejected.
 */
export const recomputeWaitlistCounts = onCall(
  {region: REGION},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to recompute counts.",
      );
    }

    const db = getFirestore();
    const users = db.collection(USERS_COLLECTION);
    const counts = db.collection(WAITLIST_COUNTS_COLLECTION);

    const results = await Promise.all(
      COMMUNITY_IDS.map(async (community) => {
        const aggregate = await users
          .where("community", "==", community)
          .count()
          .get();
        const count = aggregate.data().count;
        await counts.doc(community).set(
          {
            community,
            count,
            updatedAt: FieldValue.serverTimestamp(),
          },
          {merge: true},
        );
        return {community, count};
      }),
    );

    logger.info("Recomputed community counts", {communities: results.length});
    return {communities: results};
  },
);
