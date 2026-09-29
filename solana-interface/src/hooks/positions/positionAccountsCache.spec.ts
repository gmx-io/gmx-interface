import { describe, expect, it } from "vitest";

import { applyAccountUpdate, reconcileSnapshot, selectOpenPositions } from "./positionAccountsCache";
import type { RawSolanaPosition } from "./types";

function position(pubkey: string, slot: number, sizeInUsd = 1n): RawSolanaPosition {
  return {
    pubkey,
    base64: "",
    slot,
    owner: "owner",
    marketToken: "market",
    collateralToken: "collateral",
    kind: 1,
    isLong: true,
    sizeInUsd,
    sizeInTokens: 1n,
    collateralAmount: 1n,
    borrowingFactor: 0n,
    fundingFeeAmountPerSize: 0n,
    longTokenClaimableFundingAmountPerSize: 0n,
    shortTokenClaimableFundingAmountPerSize: 0n,
    increasedAt: 0n,
    decreasedAt: 0n,
    updatedAtSlot: BigInt(slot),
    tradeId: 0n,
  };
}

describe("applyAccountUpdate", () => {
  it("stores a new entry", () => {
    const cache = new Map<string, RawSolanaPosition>();
    expect(applyAccountUpdate(cache, "a", 10, position("a", 10))).toBe(true);
    expect(cache.get("a")?.slot).toBe(10);
  });

  it("drops updates older than the cached slot", () => {
    const cache = new Map([["a", position("a", 10)]]);
    expect(applyAccountUpdate(cache, "a", 9, position("a", 9))).toBe(false);
    expect(cache.get("a")?.slot).toBe(10);
  });

  it("accepts updates at the same or a newer slot", () => {
    const cache = new Map([["a", position("a", 10)]]);
    expect(applyAccountUpdate(cache, "a", 10, position("a", 10, 5n))).toBe(true);
    expect(applyAccountUpdate(cache, "a", 11, position("a", 11, 7n))).toBe(true);
    expect(cache.get("a")?.sizeInUsd).toBe(7n);
  });

  it("removes an entry when the account is no longer a Long/Short position", () => {
    const cache = new Map([["a", position("a", 10)]]);
    expect(applyAccountUpdate(cache, "a", 11, undefined)).toBe(true);
    expect(cache.has("a")).toBe(false);
    expect(applyAccountUpdate(cache, "b", 11, undefined)).toBe(false);
  });
});

describe("reconcileSnapshot", () => {
  it("removes entries missing from the snapshot", () => {
    const cache = new Map([
      ["a", position("a", 10)],
      ["b", position("b", 10)],
    ]);
    expect(reconcileSnapshot(cache, new Set(["a"]), 12)).toBe(true);
    expect([...cache.keys()]).toEqual(["a"]);
  });

  it("keeps entries updated after the snapshot slot", () => {
    const cache = new Map([["b", position("b", 15)]]);
    expect(reconcileSnapshot(cache, new Set(), 12)).toBe(false);
    expect(cache.has("b")).toBe(true);
  });
});

describe("selectOpenPositions", () => {
  it("hides closed positions with zero size", () => {
    const cache = new Map([
      ["a", position("a", 1, 0n)],
      ["b", position("b", 1, 5n)],
    ]);
    expect(selectOpenPositions(cache).map((p) => p.pubkey)).toEqual(["b"]);
  });
});
