import { describe, it, expect } from "vitest";

import { SECONDS_IN_DAY } from "lib/dates";

import {
  applySubCategoryFilter,
  applyTopLevelFilter,
  getRecentlyListedTokenAddresses,
  isMarketRecentlyListed,
} from "../marketFilters";

const tokens = [
  { address: "0xeth", categories: ["layer1"] },
  { address: "0xarb", categories: ["layer2"] },
  { address: "0xfet", categories: ["ai"] },
  { address: "0xtao", categories: ["layer1", "ai"] },
  { address: "0xgold", categories: ["tradfi", "commodities"] },
  { address: "0xusdc", categories: undefined },
] as any[];

const RECENTLY_LISTED_WINDOW_MS = SECONDS_IN_DAY * 30 * 1000;

describe("applyTopLevelFilter", () => {
  it("returns all tokens for 'all'", () => {
    expect(applyTopLevelFilter(tokens, { topLevelTab: "all", favoriteAddresses: [] })).toEqual(tokens);
  });

  it("returns crypto-tagged tokens for 'crypto' (excludes tradfi and uncategorized)", () => {
    const result = applyTopLevelFilter(tokens, {
      topLevelTab: "crypto",
      favoriteAddresses: [],
    });
    expect(result.map((t) => t.address)).toEqual(["0xeth", "0xarb", "0xfet", "0xtao"]);
  });

  it("returns only tradfi tokens for 'tradfi'", () => {
    const result = applyTopLevelFilter(tokens, {
      topLevelTab: "tradfi",
      favoriteAddresses: [],
    });
    expect(result.map((t) => t.address)).toEqual(["0xgold"]);
  });

  it("returns favorites only", () => {
    const result = applyTopLevelFilter(tokens, {
      topLevelTab: "favorites",
      favoriteAddresses: ["0xeth", "0xfet"],
    });
    expect(result.map((t) => t.address)).toEqual(["0xeth", "0xfet"]);
  });

  it("returns empty by default for 'recently-listed' (set wired in Phase 4)", () => {
    expect(applyTopLevelFilter(tokens, { topLevelTab: "recently-listed", favoriteAddresses: [] })).toEqual([]);
  });

  it("'recently-listed' uses provided address set", () => {
    const result = applyTopLevelFilter(tokens, {
      topLevelTab: "recently-listed",
      favoriteAddresses: [],
      recentlyListedAddresses: new Set(["0xeth", "0xgold"]),
    });
    expect(result.map((t) => t.address)).toEqual(["0xeth", "0xgold"]);
  });
});

describe("applySubCategoryFilter", () => {
  it("returns input unchanged for 'all' sub-cat", () => {
    expect(applySubCategoryFilter(tokens, { topLevelTab: "crypto", subCategoryTab: "all" })).toEqual(tokens);
  });

  it("filters to AI within crypto (multi-tag tokens included)", () => {
    const result = applySubCategoryFilter(tokens, {
      topLevelTab: "crypto",
      subCategoryTab: "ai",
    });
    expect(result.map((t) => t.address)).toEqual(["0xfet", "0xtao"]);
  });

  it("filters to commodities within tradfi", () => {
    const result = applySubCategoryFilter(tokens, {
      topLevelTab: "tradfi",
      subCategoryTab: "commodities",
    });
    expect(result.map((t) => t.address)).toEqual(["0xgold"]);
  });

  it("ignores sub-cat when parent is not crypto/tradfi", () => {
    expect(applySubCategoryFilter(tokens, { topLevelTab: "all", subCategoryTab: "ai" })).toEqual(tokens);
  });
});

describe("isMarketRecentlyListed", () => {
  const now = Date.UTC(2026, 4, 6); // 2026-05-06

  it("returns true within the 30-day window", () => {
    expect(isMarketRecentlyListed(now - 1000, now)).toBe(true);
    expect(isMarketRecentlyListed(now - RECENTLY_LISTED_WINDOW_MS + 1, now)).toBe(true);
  });

  it("returns false on or after the window edge", () => {
    expect(isMarketRecentlyListed(now - RECENTLY_LISTED_WINDOW_MS, now)).toBe(false);
    expect(isMarketRecentlyListed(now - RECENTLY_LISTED_WINDOW_MS - 1, now)).toBe(false);
  });

  it("returns false when listingDate is undefined", () => {
    expect(isMarketRecentlyListed(undefined, now)).toBe(false);
  });
});

describe("getRecentlyListedTokenAddresses", () => {
  const now = Date.UTC(2026, 4, 6);

  it("returns lowercased addresses inside the window", () => {
    const map = {
      "0xAaA": now - 1000,
      "0xBBB": now - RECENTLY_LISTED_WINDOW_MS - 1,
      "0xccc": now - 5 * 24 * 60 * 60 * 1000,
    };
    const result = getRecentlyListedTokenAddresses(map, now);
    expect(result.sort()).toEqual(["0xaaa", "0xccc"].sort());
  });

  it("returns empty when input map is empty", () => {
    expect(getRecentlyListedTokenAddresses({}, now)).toEqual([]);
  });

  it("excludes entries equal to or older than window edge", () => {
    const map = {
      "0xexact": now - RECENTLY_LISTED_WINDOW_MS,
      "0xolder": now - RECENTLY_LISTED_WINDOW_MS - 1,
    };
    expect(getRecentlyListedTokenAddresses(map, now)).toEqual([]);
  });
});
