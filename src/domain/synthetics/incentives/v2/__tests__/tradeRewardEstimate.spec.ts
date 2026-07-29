import { describe, expect, it } from "vitest";

import { PRECISION } from "lib/numbers";

import { getEstimatedTradeRewards, getTradeMultiplierEstimate } from "../tradeRewardEstimate";
import type { AccountIncentiveStatus, IncentivesConfig } from "../types";

const MARKET = "0xAbC0000000000000000000000000000000000001";
const INDEX_TOKEN = "0xAbC0000000000000000000000000000000000002";

function usd(value: bigint) {
  return value * PRECISION;
}

function makeConfig(overrides: Partial<IncentivesConfig> = {}): IncentivesConfig {
  return {
    epochTimestamp: 1_784_073_600,
    epochStartTimestamp: 1_781_654_400,
    programStartTimestamp: 1_781_654_400,
    epochDuration: 604_800,
    maxMultiplier: 1000n,
    multiplierDecimals: 100n,
    volumeTierPersistenceEpochs: 4,
    feeShareFactor: PRECISION / 10n,
    esGmxShareFactor: PRECISION,
    gtShareFactor: PRECISION / 5n,
    referralRewardShareFactor: PRECISION / 2n,
    volumeTiers: [
      { tier: "Tier1", threshold: usd(1_000n), multiplier: 100n },
      { tier: "Tier2", threshold: usd(10_000n), multiplier: 200n },
      { tier: "Tier3", threshold: usd(100_000n), multiplier: 300n },
      { tier: "Tier4", threshold: usd(500_000n), multiplier: 400n },
      { tier: "Tier5", threshold: usd(1_000_000n), multiplier: 500n },
    ],
    stakingTiers: [
      { tier: "Tier1", threshold: 10n * 10n ** 18n, multiplier: 100n },
      { tier: "Tier2", threshold: 100n * 10n ** 18n, multiplier: 200n },
      { tier: "Tier3", threshold: 1_000n * 10n ** 18n, multiplier: 300n },
      { tier: "Tier4", threshold: 10_000n * 10n ** 18n, multiplier: 400n },
      { tier: "Tier5", threshold: 50_000n * 10n ** 18n, multiplier: 500n },
    ],
    boosts: [
      { boost: "FeaturedMarkets", multiplier: 50n },
      { boost: "BalancingTrades", multiplier: 100n },
      { boost: "LifetimeTrading", multiplier: 100n },
      { boost: "ManualAllocation", multiplier: 200n },
    ],
    featuredMarketIndexTokens: [INDEX_TOKEN],
    downgradingCoefficients: [{ market: MARKET, coefficient: 50n }],
    balancingTradesThreshold: usd(1_000_000n),
    lifetimeVolumeThreshold: usd(200_000_000n),
    manualAllocationTiers: [],
    ...overrides,
  };
}

function makeStatus(overrides: Partial<AccountIncentiveStatus> = {}): AccountIncentiveStatus {
  return {
    account: "0xAbC0000000000000000000000000000000000003",
    multiplier: 0n,
    volumeTier: null,
    stakingTier: null,
    projectedVolumeTier: null,
    projectedStakingTier: null,
    epochTimestamp: 1_784_073_600,
    tradingVolume: 0n,
    tierVolume: 0n,
    referralVolume: 0n,
    currentStakedBalance: 0n,
    boostIds: [],
    esGmxRewards: 0n,
    gtRewards: 0n,
    rewardsUsd: 0n,
    manualRewardCapUsd: 0n,
    manualRewardConsumedUsd: 0n,
    manualRewardRemainingUsd: 0n,
    ...overrides,
  };
}

function makeParams(
  overrides: Partial<Parameters<typeof getEstimatedTradeRewards>[0]> = {}
): Parameters<typeof getEstimatedTradeRewards>[0] {
  return {
    config: makeConfig(),
    status: makeStatus(),
    positionFeeUsd: usd(100n),
    totalRebateFactor: 0n,
    sizeDeltaUsd: usd(100n),
    indexTokenAddress: "0xAbC0000000000000000000000000000000000005",
    isIncrease: true,
    balanceWasImproved: false,
    gmxPrice: usd(2n),
    gtPrice: (PRECISION * 8n) / 10n,
    ...overrides,
  };
}

describe("V2 trade reward estimate", () => {
  it("deducts the full referral rebate and converts each configured reward share to tokens", () => {
    const result = getEstimatedTradeRewards(
      makeParams({
        status: makeStatus({ volumeTier: "Tier1" }),
        totalRebateFactor: PRECISION / 5n,
      })
    );

    expect(result.eligibleFeeUsd).toBe(usd(80n));
    expect(result.effectiveMultiplier).toBe(100n);
    expect(result.baseRewardUsd).toBe(usd(8n));
    expect(result.esGmxRewardsUsd).toBe(usd(8n));
    expect(result.gtRewardsUsd).toBe((usd(8n) * 2n) / 10n);
    expect(result.rewardsUsd).toBe((usd(96n) * 1n) / 10n);
    expect(result.esGmxRewards).toBe(4n * 10n ** 18n);
    expect(result.gtRewards).toBe(2n * 10n ** 7n);
  });

  it("has no baseline reward multiplier", () => {
    const result = getEstimatedTradeRewards(makeParams());

    expect(result.effectiveMultiplier).toBe(0n);
    expect(result.rewardsUsd).toBe(0n);
    expect(result.esGmxRewards).toBe(0n);
    expect(result.gtRewards).toBe(0n);
  });

  it("does not use a crossed volume tier before it becomes active", () => {
    const crossingTrade = getEstimatedTradeRewards(
      makeParams({
        status: makeStatus({ stakingTier: "Tier1", tierVolume: usd(900n) }),
        sizeDeltaUsd: usd(200n),
      })
    );
    const activeTierTrade = getEstimatedTradeRewards(
      makeParams({
        status: makeStatus({ volumeTier: "Tier1", stakingTier: "Tier1", tierVolume: usd(1_000n) }),
        sizeDeltaUsd: usd(100n),
      })
    );

    expect(crossingTrade.effectiveMultiplier).toBe(100n);
    expect(crossingTrade.baseRewardUsd).toBe(usd(10n));
    expect(activeTierTrade.effectiveMultiplier).toBe(200n);
    expect(activeTierTrade.baseRewardUsd).toBe(usd(20n));
  });

  it("adds persistent and per-trade boosts without treating historical trade boosts as persistent", () => {
    const result = getTradeMultiplierEstimate({
      ...makeParams({
        status: makeStatus({
          volumeTier: "Tier2",
          stakingTier: "Tier2",
          boostIds: ["LifetimeTrading", "FeaturedMarkets", "BalancingTrades"],
        }),
        sizeDeltaUsd: usd(1_000_000n),
        indexTokenAddress: INDEX_TOKEN,
        balanceWasImproved: true,
      }),
    });

    expect(result.normalMultiplier).toBe(650n);
    expect(result.fullMultiplier).toBe(650n);
  });

  it("does not use an earned lifetime boost before it becomes active", () => {
    const crossingTrade = getTradeMultiplierEstimate({
      ...makeParams({
        status: makeStatus({ volumeTier: "Tier1" }),
        sizeDeltaUsd: usd(200_000_000n),
      }),
    });
    const activeBoostTrade = getTradeMultiplierEstimate({
      ...makeParams({
        status: makeStatus({ volumeTier: "Tier1", boostIds: ["LifetimeTrading"] }),
      }),
    });

    expect(crossingTrade.effectiveMultiplier).toBe(100n);
    expect(activeBoostTrade.effectiveMultiplier).toBe(200n);
  });

  it("applies the balancing boost only to qualifying position increases", () => {
    const config = makeConfig({ volumeTiers: [] });
    const qualifying = getTradeMultiplierEstimate({
      ...makeParams({
        config,
        sizeDeltaUsd: usd(1_000_000n),
        balanceWasImproved: true,
      }),
    });
    const decrease = getTradeMultiplierEstimate({
      ...makeParams({
        config,
        sizeDeltaUsd: usd(1_000_000n),
        balanceWasImproved: true,
        isIncrease: false,
      }),
    });
    const belowThreshold = getTradeMultiplierEstimate({
      ...makeParams({
        config,
        sizeDeltaUsd: usd(999_999n),
        balanceWasImproved: true,
      }),
    });

    expect(qualifying.effectiveMultiplier).toBe(100n);
    expect(decrease.effectiveMultiplier).toBe(0n);
    expect(belowThreshold.effectiveMultiplier).toBe(0n);
  });

  it("partially applies a capped manual allocation after accounting for the multiplier cap", () => {
    const result = getEstimatedTradeRewards(
      makeParams({
        status: makeStatus({
          volumeTier: "Tier5",
          stakingTier: "Tier4",
          boostIds: ["ManualAllocation"],
          manualRewardCapUsd: usd(100n),
          manualRewardConsumedUsd: usd(94n),
          manualRewardRemainingUsd: usd(6n),
        }),
        gmxPrice: PRECISION,
        gtPrice: PRECISION,
      })
    );

    expect(result.normalMultiplier).toBe(900n);
    expect(result.fullMultiplier).toBe(1000n);
    expect(result.manualMultiplier).toBe(50n);
    expect(result.effectiveMultiplier).toBe(950n);
    expect(result.baseRewardUsd).toBe(usd(95n));
    expect(result.manualRewardsUsd).toBe(usd(6n));
    expect(result.esGmxRewardsUsd).toBe(usd(95n));
    expect(result.gtRewardsUsd).toBe(usd(19n));
    expect(result.rewardsUsd).toBe(usd(114n));
  });

  it("keeps USD estimates available when a reward token price is unavailable", () => {
    const result = getEstimatedTradeRewards(
      makeParams({
        status: makeStatus({ volumeTier: "Tier1" }),
        gmxPrice: undefined,
        gtPrice: undefined,
      })
    );

    expect(result.rewardsUsd).toBe(usd(12n));
    expect(result.esGmxRewards).toBeUndefined();
    expect(result.gtRewards).toBeUndefined();
  });

  it("returns zero safely for an invalid multiplier denominator", () => {
    const result = getEstimatedTradeRewards(
      makeParams({
        config: makeConfig({ multiplierDecimals: 0n }),
        status: makeStatus({ volumeTier: "Tier1" }),
      })
    );

    expect(result.effectiveMultiplier).toBe(0n);
    expect(result.rewardsUsd).toBe(0n);
  });
});
