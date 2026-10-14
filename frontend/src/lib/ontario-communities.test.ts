import { describe, expect, it } from "vitest";

import {
  getCommunityById,
  getCommunityLabel,
  isCanonicalCommunityId,
  ONTARIO_COMMUNITIES,
  searchCommunities,
} from "./ontario-communities";

describe("ONTARIO_COMMUNITIES", () => {
  it("has unique ids", () => {
    const ids = ONTARIO_COMMUNITIES.map((community) => community.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes the major regions called out in the requirements", () => {
    const ids = ONTARIO_COMMUNITIES.map((community) => community.id);
    for (const expected of [
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
    ]) {
      expect(ids).toContain(expected);
    }
  });
});

describe("isCanonicalCommunityId", () => {
  it("accepts known ids", () => {
    expect(isCanonicalCommunityId("toronto")).toBe(true);
  });

  it("rejects unknown ids", () => {
    expect(isCanonicalCommunityId("atlantis")).toBe(false);
  });
});

describe("getCommunityById / getCommunityLabel", () => {
  it("resolves a known id", () => {
    expect(getCommunityById("ottawa")?.label).toBe("Ottawa");
    expect(getCommunityLabel("ottawa")).toBe("Ottawa");
  });

  it("falls back to the raw id for unknown values", () => {
    expect(getCommunityById("atlantis")).toBeUndefined();
    expect(getCommunityLabel("atlantis")).toBe("atlantis");
  });
});

describe("searchCommunities", () => {
  it("returns the full list for an empty query", () => {
    expect(searchCommunities("")).toHaveLength(ONTARIO_COMMUNITIES.length);
  });

  it("matches on label substrings, case-insensitively", () => {
    const results = searchCommunities("tor");
    expect(results.map((community) => community.id)).toContain("toronto");
  });

  it("matches on id substrings", () => {
    const results = searchCommunities("muskoka");
    expect(results.map((community) => community.id)).toEqual(["simcoe-muskoka"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(searchCommunities("zzzzz")).toEqual([]);
  });
});
