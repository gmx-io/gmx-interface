import { describe, expect, it } from "vitest";

import { PRECISION } from "lib/numbers";

import { getEstimatedTradeRewards, getTradeMultiplierEstimate } from "../tradeRewardEstimate";
import type { AccountIncentiveStatus, IncentivesConfig } from "../types";

const MARKET = "0xAbC0000000000000000000000000000000000001";
const OTHER_MARKET = "0xAbC0000000000000000000000000000000000004";

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
    featuredMarketTokens: [MARKET],
    downgradingFactors: [{ market: MARKET, factor: PRECISION / 2n }],
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
    marketTokenAddress: OTHER_MARKET,
    isIncrease: true,
    balanceWasImproved: false,
    gmxPrice: usd(2n),
    gtPrice: (PRECISION * 8n) / 10n,
    ...overrides,
  };
}

describe("V2 trade reward estimate", () => {
  it.each([
    { feeDiscountUsd: usd(50n), totalRebateFactor: 0n, referralDiscountFactor: 0n, eligibleFeeUsd: usd(50n) },
    {
      feeDiscountUsd: usd(10n),
      totalRebateFactor: PRECISION / 5n,
      referralDiscountFactor: PRECISION / 2n,
      eligibleFeeUsd: usd(80n),
    },
    {
      feeDiscountUsd: usd(50n),
      totalRebateFactor: PRECISION / 5n,
      referralDiscountFactor: PRECISION / 2n,
      minAffiliateRewardFactor: PRECISION / 20n,
      eligibleFeeUsd: usd(45n),
    },
    {
      feeDiscountUsd: usd(13n),
      totalRebateFactor: PRECISION / 5n,
      referralDiscountFactor: PRECISION / 2n,
      minAffiliateRewardFactor: PRECISION / 20n,
      eligibleFeeUsd: usd(80n),
    },
    {
      feeDiscountUsd: usd(18n),
      totalRebateFactor: PRECISION / 5n,
      referralDiscountFactor: PRECISION / 2n,
      minAffiliateRewardFactor: PRECISION / 20n,
      eligibleFeeUsd: usd(77n),
    },
  ])("uses net fees after trader discounts and affiliate rewards (case %#)", ({ eligibleFeeUsd, ...fees }) => {
    const result = getEstimatedTradeRewards(makeParams({ ...fees, status: makeStatus({ volumeTier: "Tier1" }) }));

    expect(result.eligibleFeeUsd).toBe(eligibleFeeUsd);
    expect(result.rewardsUsd).toBe((eligibleFeeUsd * 12n) / 100n);
  });

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

  it.each([
    {
      name: "a crossed volume tier before it becomes active",
      params: { status: makeStatus({ stakingTier: "Tier1", tierVolume: usd(900n) }), sizeDeltaUsd: usd(200n) },
      expected: 100n,
    },
    {
      name: "an active volume tier",
      params: { status: makeStatus({ volumeTier: "Tier1", stakingTier: "Tier1", tierVolume: usd(1_000n) }) },
      expected: 200n,
    },
    {
      name: "persistent and per-trade boosts without historical trade boosts",
      params: {
        status: makeStatus({
          volumeTier: "Tier2",
          stakingTier: "Tier2",
          boostIds: ["LifetimeTrading", "FeaturedMarkets", "BalancingTrades"],
        }),
        sizeDeltaUsd: usd(1_000_000n),
        marketTokenAddress: MARKET,
        balanceWasImproved: true,
      },
      expected: 650n,
    },
    {
      name: "the featured boost on the configured market token",
      params: { config: makeConfig({ volumeTiers: [] }), marketTokenAddress: MARKET },
      expected: 50n,
    },
    {
      name: "another pool with the same index token",
      params: { config: makeConfig({ volumeTiers: [] }), marketTokenAddress: OTHER_MARKET },
      expected: 0n,
    },
    {
      name: "an earned lifetime boost before it becomes active",
      params: { status: makeStatus({ volumeTier: "Tier1" }), sizeDeltaUsd: usd(200_000_000n) },
      expected: 100n,
    },
    {
      name: "an active lifetime boost",
      params: { status: makeStatus({ volumeTier: "Tier1", boostIds: ["LifetimeTrading"] }) },
      expected: 200n,
    },
    {
      name: "a qualifying balancing increase",
      params: { config: makeConfig({ volumeTiers: [] }), sizeDeltaUsd: usd(1_000_000n), balanceWasImproved: true },
      expected: 100n,
    },
    {
      name: "a balancing decrease",
      params: {
        config: makeConfig({ volumeTiers: [] }),
        sizeDeltaUsd: usd(1_000_000n),
        balanceWasImproved: true,
        isIncrease: false,
      },
      expected: 0n,
    },
    {
      name: "a balancing increase below the threshold",
      params: { config: makeConfig({ volumeTiers: [] }), sizeDeltaUsd: usd(999_999n), balanceWasImproved: true },
      expected: 0n,
    },
  ])("estimates the multiplier for $name", ({ params, expected }) => {
    expect(getTradeMultiplierEstimate(makeParams(params)).effectiveMultiplier).toBe(expected);
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
