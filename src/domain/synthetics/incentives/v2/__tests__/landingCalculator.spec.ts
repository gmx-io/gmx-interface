import { describe, expect, it } from "vitest";

import { expandDecimals, PRECISION } from "lib/numbers";

import { getLandingRewardEstimate } from "../landingCalculator";
import type { IncentivesConfig } from "../types";

const config: IncentivesConfig = {
  epochTimestamp: 1788912000,
  epochStartTimestamp: 1781654400,
  programStartTimestamp: 1781654400,
  epochDuration: 604800,
  volumeTierPersistenceEpochs: 4,
  multiplierDecimals: 100n,
  maxMultiplier: 1000n,
  feeShareFactor: PRECISION / 10n,
  esGmxShareFactor: PRECISION,
  gtShareFactor: PRECISION / 5n,
  referralRewardShareFactor: PRECISION / 2n,
  volumeTiers: [
    { tier: "Tier1", threshold: 1_000_000n * PRECISION, multiplier: 100n },
    { tier: "Tier2", threshold: 10_000_000n * PRECISION, multiplier: 200n },
    { tier: "Tier5", threshold: 1_000_000_000n * PRECISION, multiplier: 500n },
  ],
  stakingTiers: [
    { tier: "Tier1", threshold: expandDecimals(10, 18), multiplier: 100n },
    { tier: "Tier3", threshold: expandDecimals(1_000, 18), multiplier: 300n },
    { tier: "Tier5", threshold: expandDecimals(50_000, 18), multiplier: 500n },
  ],
  boosts: [
    { boost: "ManualAllocation", multiplier: 200n },
    { boost: "FeaturedMarkets", multiplier: 50n },
  ],
  featuredMarketTokens: [],
  downgradingFactors: [],
  balancingTradesThreshold: 1_000_000n * PRECISION,
  lifetimeVolumeThreshold: 200_000_000n * PRECISION,
  manualAllocationTiers: [],
};

describe("landing rewards calculator", () => {
  it("estimates the agreed $200K example at $100 fees and 5x, with a $50 / $10 split", () => {
    const result = getLandingRewardEstimate({
      config,
      volumeUsd: 200_000n * PRECISION,
      stakedAmount: expandDecimals(1_000, 18),
      boosts: ["ManualAllocation"],
    });
    expect(result.feesUsd).toBe(100n * PRECISION);
    expect(result.volumeMultiplier).toBe(0n);
    expect(result.multiplier).toBe(500n);
    expect(result.esGmxRewardsUsd).toBe(50n * PRECISION);
    expect(result.gtRewardsUsd).toBe(10n * PRECISION);
    expect(result.rewardsUsd).toBe(60n * PRECISION);
  });

  it("applies tiers at their exact thresholds and does not add a baseline multiplier", () => {
    const estimate = (volumeUsd: bigint, stakedAmount = 0n) =>
      getLandingRewardEstimate({ config, volumeUsd, stakedAmount, boosts: [] });
    expect(estimate(PRECISION).rewardsUsd).toBe(0n);
    expect(estimate(1_000_000n * PRECISION - 1n).multiplier).toBe(0n);
    expect(estimate(1_000_000n * PRECISION).multiplier).toBe(100n);
    expect(estimate(10_000_000n * PRECISION, expandDecimals(10, 18)).multiplier).toBe(300n);
  });

  it("caps stacked boosts and tiers at the configured maximum", () => {
    const result = getLandingRewardEstimate({
      config,
      volumeUsd: 1_000_000_000n * PRECISION,
      stakedAmount: expandDecimals(50_000, 18),
      boosts: ["ManualAllocation", "FeaturedMarkets"],
    });
    expect(result.multiplier).toBe(1000n);
    expect(result.isCapped).toBe(true);
    expect(result.rewardsUsd).toBe((result.feesUsd * 12n) / 10n);
  });

  it("uses changed configuration shares and supports fractional boosts", () => {
    const result = getLandingRewardEstimate({
      config: { ...config, feeShareFactor: PRECISION / 5n, gtShareFactor: PRECISION / 2n },
      volumeUsd: 200_000n * PRECISION,
      stakedAmount: 0n,
      boosts: ["FeaturedMarkets", "FeaturedMarkets"],
    });
    expect(result.multiplier).toBe(50n);
    expect(result.esGmxRewardsUsd).toBe(10n * PRECISION);
    expect(result.gtRewardsUsd).toBe(5n * PRECISION);
  });
});
