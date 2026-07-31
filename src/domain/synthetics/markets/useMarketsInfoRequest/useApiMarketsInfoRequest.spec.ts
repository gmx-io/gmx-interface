import { afterEach, describe, expect, it, vi } from "vitest";

import type { ContractsChainId } from "sdk/configs/chains";
import type { RawMarketConfig, RawMarketValues } from "sdk/utils/markets/types";

import {
  MARKETS_STALE_THRESHOLD_MS,
  getIsValuesSnapshotFrozen,
  hasIncompleteMarketValues,
  hasStaleMarketValues,
  trackValuesSnapshot,
} from "./useApiMarketsInfoRequest";

function value(marketTokenAddress: string, updatedAt: number | null): RawMarketValues {
  return {
    marketTokenAddress,
    updatedAt,
    virtualInventoryForPositionsInTokens: 0n,
  } as RawMarketValues;
}

function config(marketTokenAddress: string, isDisabled = false): RawMarketConfig {
  return {
    marketTokenAddress,
    isDisabled,
    virtualIndexTokenId: "0x00",
    maxCollateralSumLongTokenLong: 0n,
    maxCollateralSumLongTokenShort: 0n,
    maxCollateralSumShortTokenLong: 0n,
    maxCollateralSumShortTokenShort: 0n,
  } as RawMarketConfig;
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

  it("flags an enabled market lagging the newest market beyond the threshold as stale", () => {
    const newest = 1_000_000;
    expect(
      hasStaleMarketValues(
        [config("0xa"), config("0xlagging")],
        [value("0xa", newest), value("0xlagging", newest - MARKETS_STALE_THRESHOLD_MS - 1)],
        new Set()
      )
    ).toBe(true);
    expect(
      hasStaleMarketValues(
        [config("0xa"), config("0xlagging")],
        [value("0xa", newest), value("0xlagging", newest - MARKETS_STALE_THRESHOLD_MS)],
        new Set()
      )
    ).toBe(false);
  });

  it("is immune to client clock skew", () => {
    vi.useFakeTimers();
    vi.setSystemTime(50_000_000);
    expect(
      hasStaleMarketValues([config("0xa"), config("0xb")], [value("0xa", 1_000), value("0xb", 900)], new Set())
    ).toBe(false);
  });

  it("flags an enabled market with null updatedAt as stale", () => {
    expect(hasStaleMarketValues([config("0xa")], [value("0xa", null)], new Set())).toBe(true);
  });

  it("flags v2.2c API payloads with missing config or values fields as stale", () => {
    const incompleteConfig = {
      ...config("0xa"),
      virtualIndexTokenId: undefined,
    } as unknown as RawMarketConfig;
    const incompleteValue = {
      ...value("0xa", Date.now()),
      virtualInventoryForPositionsInTokens: undefined,
    } as unknown as RawMarketValues;

    expect(hasStaleMarketValues([incompleteConfig], [value("0xa", Date.now())], new Set())).toBe(true);
    expect(hasStaleMarketValues([config("0xa")], [incompleteValue], new Set())).toBe(true);
  });

  it("distinguishes structurally incomplete API payloads from ordinary staleness", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    expect(
      hasIncompleteMarketValues([config("0xa")], [value("0xa", 1_000_000 - MARKETS_STALE_THRESHOLD_MS - 1)], new Set())
    ).toBe(false);
    expect(
      hasIncompleteMarketValues(
        [{ ...config("0xa"), maxCollateralSumLongTokenLong: undefined } as unknown as RawMarketConfig],
        [value("0xa", 1_000_000)],
        new Set()
      )
    ).toBe(true);
    expect(hasIncompleteMarketValues([config("0xa")], [], new Set())).toBe(true);
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

describe("values snapshot freshness", () => {
  const chainId = 42161 as ContractsChainId;

  it("is not frozen while re-evaluating the same response", () => {
    const snapshot = trackValuesSnapshot(undefined, chainId, [value("0xa", 1_000)], 5_000);
    expect(getIsValuesSnapshotFrozen(snapshot, 5_000)).toBe(false);
  });

  it("freezes when responses keep arriving but the newest updatedAt never moves", () => {
    let snapshot = trackValuesSnapshot(undefined, chainId, [value("0xa", 1_000)], 5_000);
    snapshot = trackValuesSnapshot(snapshot, chainId, [value("0xa", 1_000)], 5_000 + MARKETS_STALE_THRESHOLD_MS);
    expect(getIsValuesSnapshotFrozen(snapshot, 5_000 + MARKETS_STALE_THRESHOLD_MS)).toBe(false);

    snapshot = trackValuesSnapshot(snapshot, chainId, [value("0xa", 1_000)], 5_000 + MARKETS_STALE_THRESHOLD_MS + 1);
    expect(getIsValuesSnapshotFrozen(snapshot, 5_000 + MARKETS_STALE_THRESHOLD_MS + 1)).toBe(true);
  });

  it("unfreezes as soon as the newest updatedAt changes", () => {
    let snapshot = trackValuesSnapshot(undefined, chainId, [value("0xa", 1_000)], 5_000);
    snapshot = trackValuesSnapshot(snapshot, chainId, [value("0xa", 2_000)], 5_000 + MARKETS_STALE_THRESHOLD_MS + 1);
    expect(getIsValuesSnapshotFrozen(snapshot, 5_000 + MARKETS_STALE_THRESHOLD_MS + 1)).toBe(false);
  });

  it("resets when the chain changes", () => {
    const otherChainId = 43114 as ContractsChainId;
    let snapshot = trackValuesSnapshot(undefined, chainId, [value("0xa", 1_000)], 5_000);
    snapshot = trackValuesSnapshot(
      snapshot,
      otherChainId,
      [value("0xa", 1_000)],
      5_000 + MARKETS_STALE_THRESHOLD_MS + 1
    );
    expect(snapshot?.chainId).toBe(otherChainId);
    expect(getIsValuesSnapshotFrozen(snapshot, 5_000 + MARKETS_STALE_THRESHOLD_MS + 1)).toBe(false);
  });

  it("keeps the snapshot for the same chain while data is temporarily missing", () => {
    let snapshot = trackValuesSnapshot(undefined, chainId, [value("0xa", 1_000)], 5_000);
    const kept = trackValuesSnapshot(snapshot, chainId, undefined, undefined);
    expect(kept).toBe(snapshot);

    const dropped = trackValuesSnapshot(snapshot, 43114 as ContractsChainId, undefined, undefined);
    expect(dropped).toBeUndefined();
  });
});
