import { afterEach, describe, expect, it, vi } from "vitest";

import type { RawMarketValues } from "sdk/utils/markets/types";

import { MARKETS_STALE_THRESHOLD_MS, hasStaleMarketValues } from "./useApiMarketsInfoRequest";

function value(marketTokenAddress: string, updatedAt: number | null): RawMarketValues {
  return { marketTokenAddress, updatedAt } as RawMarketValues;
}

describe("hasStaleMarketValues", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when there is no values data", () => {
    expect(hasStaleMarketValues(undefined, new Set())).toBe(false);
  });

  it("treats a recently-updated enabled market as fresh", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    expect(hasStaleMarketValues([value("0xa", 1_000_000 - 1_000)], new Set())).toBe(false);
  });

  it("flags an enabled market older than the threshold as stale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    expect(hasStaleMarketValues([value("0xa", 1_000_000 - MARKETS_STALE_THRESHOLD_MS - 1)], new Set())).toBe(true);
  });

  it("flags an enabled market with null updatedAt as stale", () => {
    expect(hasStaleMarketValues([value("0xa", null)], new Set())).toBe(true);
  });

  it("ignores disabled markets even when their values are null or stale", () => {
    const disabled = new Set(["0xdisabled"]);
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    expect(hasStaleMarketValues([value("0xdisabled", null)], disabled)).toBe(false);
    expect(hasStaleMarketValues([value("0xdisabled", 1_000_000 - MARKETS_STALE_THRESHOLD_MS - 1)], disabled)).toBe(
      false
    );
  });

  it("flags stale when an enabled market is stale alongside a disabled one", () => {
    const disabled = new Set(["0xdisabled"]);
    expect(hasStaleMarketValues([value("0xdisabled", null), value("0xenabled", null)], disabled)).toBe(true);
  });
});
