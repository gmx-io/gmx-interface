import { describe, expect, it } from "vitest";

import type { AccountIncentiveDashboard, EpochStats } from "domain/synthetics/incentives/types";

import { getCurrentEpochStats } from "../currentEpochStats";

function makeStats(overrides: Partial<EpochStats>): EpochStats {
  return {
    account: "0xabc",
    multiplier: 100,
    epochTimestamp: 1_000,
    volumeTier: "Tier1",
    stakingTier: "Tier1",
    tradedVolume: 1_000n,
    boostIds: ["FeaturedMarkets"],
    ...overrides,
  };
}

function makeDashboard(recentStats: EpochStats[]): AccountIncentiveDashboard {
  return {
    account: "0xabc",
    pointsBalance: 0n,
    rewardsBalance: 0n,
    recentStats,
  };
}

describe("getCurrentEpochStats", () => {
  it("returns the stats row matching the configured current epoch", () => {
    const previousStats = makeStats({ epochTimestamp: 1_000, tradedVolume: 10n });
    const currentStats = makeStats({ epochTimestamp: 2_000, tradedVolume: 20n });

    expect(
      getCurrentEpochStats({
        dashboard: makeDashboard([previousStats, currentStats]),
        config: { epochTimestamp: 2_000 },
        account: "0xabc",
      })
    ).toBe(currentStats);
  });

  it("synthesizes a zero-valued current epoch when the dashboard omits it", () => {
    const stats = getCurrentEpochStats({
      dashboard: makeDashboard([makeStats({ epochTimestamp: 1_000, tradedVolume: 10n })]),
      config: { epochTimestamp: 2_000 },
      account: "0xabc",
    });

    expect(stats).toEqual({
      account: "0xabc",
      multiplier: 0,
      epochTimestamp: 2_000,
      volumeTier: null,
      stakingTier: null,
      tradedVolume: 0n,
      boostIds: [],
    });
  });

  it("uses the connected account when there is no dashboard state yet", () => {
    expect(
      getCurrentEpochStats({
        config: { epochTimestamp: 2_000 },
        account: "0xdef",
      })
    ).toEqual({
      account: "0xdef",
      multiplier: 0,
      epochTimestamp: 2_000,
      volumeTier: null,
      stakingTier: null,
      tradedVolume: 0n,
      boostIds: [],
    });
  });

  it("falls back to the latest returned row until config is available", () => {
    const olderStats = makeStats({ epochTimestamp: 1_000 });
    const newerStats = makeStats({ epochTimestamp: 2_000 });

    expect(getCurrentEpochStats({ dashboard: makeDashboard([olderStats, newerStats]) })).toBe(newerStats);
  });
});
