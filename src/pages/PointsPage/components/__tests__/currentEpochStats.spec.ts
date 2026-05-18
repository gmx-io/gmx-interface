import { describe, expect, it } from "vitest";

import type { AccountIncentiveStatus, EpochStats } from "domain/synthetics/incentives/types";

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

function makeStatus(overrides: Partial<AccountIncentiveStatus>): AccountIncentiveStatus {
  return {
    account: "0xabc",
    pointsBalance: 0n,
    multiplier: 100,
    epochTimestamp: 1_000,
    volumeTier: "Tier1",
    stakingTier: "Tier1",
    projectedVolumeTier: null,
    projectedStakingTier: null,
    tradedVolume: 1_000n,
    pointsExpiringThisEpoch: 0n,
    boostIds: ["FeaturedMarkets"],
    ...overrides,
  };
}

describe("getCurrentEpochStats", () => {
  it("maps account incentive status into current epoch stats", () => {
    const status = makeStatus({ epochTimestamp: 2_000, tradedVolume: 20n });

    expect(getCurrentEpochStats({ status, config: { epochTimestamp: 2_000 }, account: "0xabc" })).toEqual({
      account: "0xabc",
      multiplier: 100,
      epochTimestamp: 2_000,
      volumeTier: "Tier1",
      stakingTier: "Tier1",
      tradedVolume: 20n,
      boostIds: ["FeaturedMarkets"],
    });
  });

  it("synthesizes a zero-valued current epoch when status is unavailable", () => {
    const stats = getCurrentEpochStats({
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

  it("returns undefined until either status or config with account is available", () => {
    expect(getCurrentEpochStats({ account: "0xabc" })).toBeUndefined();
  });

  it("returns status while config is unavailable", () => {
    const status = makeStatus({ epochTimestamp: 2_000 });

    expect(getCurrentEpochStats({ status })).toEqual(makeStats({ epochTimestamp: 2_000 }));
  });
});
