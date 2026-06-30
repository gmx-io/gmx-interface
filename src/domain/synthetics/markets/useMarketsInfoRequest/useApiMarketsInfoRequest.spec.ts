import { afterEach, describe, expect, it, vi } from "vitest";

import type { RawMarketConfig, RawMarketValues } from "sdk/utils/markets/types";

import { MARKETS_STALE_THRESHOLD_MS, hasStaleMarketValues } from "./useApiMarketsInfoRequest";

function value(marketTokenAddress: string, updatedAt: number | null): RawMarketValues {
  return { marketTokenAddress, updatedAt } as RawMarketValues;
}

function config(marketTokenAddress: string, isDisabled = false): RawMarketConfig {
  return { marketTokenAddress, isDisabled } as RawMarketConfig;
}

describe("hasStaleMarketValues", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when there is no config or values data", () => {
    expect(hasStaleMarketValues(undefined, undefined, new Set())).toBe(false);
    expect(hasStaleMarketValues([config("0xa")], undefined, new Set())).toBe(false);
    expect(hasStaleMarketValues(undefined, [value("0xa", Date.now())], new Set())).toBe(false);
  });

  it("treats a recently-updated enabled market as fresh", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    expect(hasStaleMarketValues([config("0xa")], [value("0xa", 1_000_000 - 1_000)], new Set())).toBe(false);
  });

  it("flags an enabled market older than the threshold as stale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    expect(
      hasStaleMarketValues([config("0xa")], [value("0xa", 1_000_000 - MARKETS_STALE_THRESHOLD_MS - 1)], new Set())
    ).toBe(true);
  });

  it("flags an enabled market with null updatedAt as stale", () => {
    expect(hasStaleMarketValues([config("0xa")], [value("0xa", null)], new Set())).toBe(true);
  });

  it("ignores disabled markets even when their values are null or stale", () => {
    const disabled = new Set(["0xdisabled"]);
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    expect(hasStaleMarketValues([config("0xdisabled", true)], [value("0xdisabled", null)], disabled)).toBe(false);
    expect(
      hasStaleMarketValues(
        [config("0xdisabled", true)],
        [value("0xdisabled", 1_000_000 - MARKETS_STALE_THRESHOLD_MS - 1)],
        disabled
      )
    ).toBe(false);
  });

  it("flags stale when an enabled market is stale alongside a disabled one", () => {
    const disabled = new Set(["0xdisabled"]);
    expect(
      hasStaleMarketValues(
        [config("0xdisabled", true), config("0xenabled")],
        [value("0xdisabled", null), value("0xenabled", null)],
        disabled
      )
    ).toBe(true);
  });

  it("flags stale when an enabled config market has no corresponding value", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    expect(hasStaleMarketValues([config("0xa"), config("0xmissing")], [value("0xa", 1_000_000)], new Set())).toBe(true);
  });

  it("does not flag stale when missing market is disabled", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const disabled = new Set(["0xmissing"]);
    expect(hasStaleMarketValues([config("0xa"), config("0xmissing", true)], [value("0xa", 1_000_000)], disabled)).toBe(
      false
    );
  });
});
