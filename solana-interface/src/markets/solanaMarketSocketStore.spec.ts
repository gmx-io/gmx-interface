import { describe, expect, it } from "vitest";

import {
  mapTickersToMints,
  mergeTickers,
  parseIndexTokensPayload,
  parseTickersPayload,
  toBigIntOrUndefined,
  toSignedBigIntOrUndefined,
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

  it("keeps signed hourly fee rates when present", () => {
    const payload = [
      {
        marketInfos: [
          {
            marketToken: "m1",
            indexToken: "idx",
            longToken: "l",
            shortToken: "s",
            supply: "1",
            longFundingFeeRateHour: "-7518201474384000",
            longBorrowingFeeRateHour: "0",
            shortFundingFeeRateHour: "5726242699815600",
            shortBorrowingFeeRateHour: "x",
            minCollateralFactorForLong: "400000000000000000",
          },
        ],
      },
    ];
    expect(parseIndexTokensPayload(payload)).toEqual([
      {
        marketToken: "m1",
        indexToken: "idx",
        longToken: "l",
        shortToken: "s",
        supply: "1",
        longFundingFeeRateHour: -7518201474384000n,
        longBorrowingFeeRateHour: 0n,
        shortFundingFeeRateHour: 5726242699815600n,
        minCollateralFactorForLong: 400000000000000000n,
      },
    ]);
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
      { symbol: "SOL", price: 200n, unitPrice: 1n, minUnitPrice: 1n, maxUnitPrice: 2n },
      { symbol: "NUM", price: undefined, unitPrice: undefined, minUnitPrice: 5n, maxUnitPrice: 6n },
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

describe("toSignedBigIntOrUndefined", () => {
  it("accepts negative integer strings on top of toBigIntOrUndefined", () => {
    expect(toSignedBigIntOrUndefined("-42")).toBe(-42n);
    expect(toSignedBigIntOrUndefined("42")).toBe(42n);
    expect(toSignedBigIntOrUndefined(-7)).toBe(-7n);
    expect(toSignedBigIntOrUndefined("-4.2")).toBeUndefined();
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
