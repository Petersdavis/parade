/**
 * Canonical list of major Ontario regions/communities used by the waitlist.
 *
 * This is the single source of truth for community options. Each entry has a
 * stable, URL-safe `id` (used as the normalized value persisted to Firestore
 * and as the leaderboard key) and a human-readable `label` shown in the UI.
 *
 * Keep ids stable: they are written into existing waitlist documents and used
 * as the aggregation key for the community leaderboard. Renaming an id would
 * orphan previously recorded signups.
 */

export interface OntarioCommunity {
  /** Stable, URL-safe identifier persisted to Firestore. */
  id: string;
  /** Human-readable label shown in the combo box and leaderboard. */
  label: string;
}

export const ONTARIO_COMMUNITIES: readonly OntarioCommunity[] = [
  { id: "toronto", label: "Toronto" },
  { id: "peel", label: "Peel Region" },
  { id: "york", label: "York Region" },
  { id: "durham", label: "Durham Region" },
  { id: "halton", label: "Halton Region" },
  { id: "hamilton", label: "Hamilton" },
  { id: "ottawa", label: "Ottawa" },
  { id: "waterloo", label: "Waterloo Region" },
  { id: "london", label: "London" },
  { id: "windsor", label: "Windsor" },
  { id: "niagara", label: "Niagara Region" },
  { id: "simcoe-muskoka", label: "Simcoe / Muskoka" },
  { id: "kingston", label: "Kingston" },
  { id: "sudbury", label: "Sudbury" },
  { id: "thunder-bay", label: "Thunder Bay" },
] as const;

/** Fast lookup of a community by its stable id. */
const COMMUNITY_BY_ID = new Map(ONTARIO_COMMUNITIES.map((community) => [community.id, community]));

/** True when `id` matches one of the canonical community ids. */
export function isCanonicalCommunityId(id: string): boolean {
  return COMMUNITY_BY_ID.has(id);
}

/** Resolve a community id to its full record, or `undefined` when unknown. */
export function getCommunityById(id: string): OntarioCommunity | undefined {
  return COMMUNITY_BY_ID.get(id);
}

/**
 * Resolve a community id to its display label, falling back to the raw id so
 * the UI never renders an empty cell for an unrecognized value.
 */
export function getCommunityLabel(id: string): string {
  return COMMUNITY_BY_ID.get(id)?.label ?? id;
}

/**
 * Case-insensitive prefix/substring search over community labels and ids.
 * Used by the combo box typeahead. An empty query returns the full list.
 */
export function searchCommunities(query: string): OntarioCommunity[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...ONTARIO_COMMUNITIES];
  }
  return ONTARIO_COMMUNITIES.filter(
    (community) =>
      community.label.toLowerCase().includes(normalized) ||
      community.id.toLowerCase().includes(normalized),
  );
}
