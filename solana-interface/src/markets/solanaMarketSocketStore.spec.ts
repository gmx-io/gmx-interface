import { describe, expect, it } from "vitest";

import {
  mapTickersToMints,
  mergeTickers,
  parseIndexTokensPayload,
  parseTickersPayload,
  toBigIntOrUndefined,
} from "./solanaMarketSocketStore";

describe("parseIndexTokensPayload", () => {
  it("flattens market infos and skips incomplete entries", () => {
    const payload = [
      {
        indexToken: "idx",
        marketInfos: [
          { marketToken: "m1", indexToken: "idx", longToken: "l", shortToken: "s", supply: "123" },
          { marketToken: "m2", indexToken: "idx", longToken: "l" },
        ],
      },
      { indexToken: "other" },
      null,
    ];
    expect(parseIndexTokensPayload(payload)).toEqual([
      { marketToken: "m1", indexToken: "idx", longToken: "l", shortToken: "s", supply: "123" },
    ]);
  });

  it("returns an empty list for non-array payloads", () => {
    expect(parseIndexTokensPayload({})).toEqual([]);
  });
});

describe("parseTickersPayload", () => {
  it("parses integer strings and skips entries without a positive range", () => {
    const payload = [
      { symbol: "SOL", price: "200", unitPrice: "1", minUnitPrice: "1", maxUnitPrice: "2" },
      { symbol: "BAD", minUnitPrice: "0", maxUnitPrice: "2" },
      { symbol: "NOPE" },
      { symbol: "NUM", minUnitPrice: 5, maxUnitPrice: 6 },
    ];
    expect(parseTickersPayload(payload)).toEqual([
      { symbol: "SOL", price: 200n, minUnitPrice: 1n, maxUnitPrice: 2n },
      { symbol: "NUM", price: undefined, minUnitPrice: 5n, maxUnitPrice: 6n },
    ]);
  });
});

describe("mergeTickers / mapTickersToMints", () => {
  it("replaces per symbol and maps onto every mint sharing the normalized symbol", () => {
    const current = new Map([["SOL", { symbol: "SOL", minUnitPrice: 1n, maxUnitPrice: 2n }]]);
    const merged = mergeTickers(current, [{ symbol: "SOL", minUnitPrice: 3n, maxUnitPrice: 4n }]);
    expect(merged.get("SOL")?.minUnitPrice).toBe(3n);

    const mints = mapTickersToMints(merged, {
      native: { symbol: "SOL" },
      wrapped: { symbol: "WSOL" },
      usdc: { symbol: "USDC" },
    });
    expect([...mints.keys()].sort()).toEqual(["native", "wrapped"]);
    expect(mints.has("usdc")).toBe(false);
  });
});

describe("toBigIntOrUndefined", () => {
  it("accepts integer strings, safe integers and bigints only", () => {
    expect(toBigIntOrUndefined("42")).toBe(42n);
    expect(toBigIntOrUndefined(42)).toBe(42n);
    expect(toBigIntOrUndefined(7n)).toBe(7n);
    expect(toBigIntOrUndefined("4.2")).toBeUndefined();
    expect(toBigIntOrUndefined(4.2)).toBeUndefined();
    expect(toBigIntOrUndefined(undefined)).toBeUndefined();
  });
});
