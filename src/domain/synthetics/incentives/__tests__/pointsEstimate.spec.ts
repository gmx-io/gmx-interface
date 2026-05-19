import { describe, expect, it } from "vitest";

import {
  DEFAULT_DOWNGRADING_COEFFICIENT,
  getEffectiveTradeMultiplier,
  getEstimatedFeeRewards,
  getEstimatedTradeRewards,
  getIsBalancingTrade,
  getMarketDowngradingCoefficient,
} from "../pointsEstimate";

const USD_DECIMALS = 30n;

describe("getEstimatedTradeRewards", () => {
  it("applies reduced market downgrading coefficient to estimated rewards", () => {
    const feeUsd = 1000n * 10n ** USD_DECIMALS;
    const gmxPrice = 20n * 10n ** USD_DECIMALS;

    const result = getEstimatedTradeRewards({
      feeUsd,
      multiplier: 250,
      totalRebate: 1000n,
      gmxPrice,
      downgradingCoefficient: 50n,
    });

    expect(result?.rewardsUsd).toBe(1125n * 10n ** 29n);
    expect(result?.rewardsGmx).toBe(5625n * 10n ** 15n);
  });

  it("does not increase rewards when coefficient is above the default", () => {
    const feeUsd = 1000n * 10n ** USD_DECIMALS;

    const defaultResult = getEstimatedTradeRewards({
      feeUsd,
      multiplier: 250,
      downgradingCoefficient: DEFAULT_DOWNGRADING_COEFFICIENT,
    });
    const aboveDefaultResult = getEstimatedTradeRewards({
      feeUsd,
      multiplier: 250,
      downgradingCoefficient: DEFAULT_DOWNGRADING_COEFFICIENT + 1n,
    });

    expect(aboveDefaultResult?.rewardsUsd).toBe(defaultResult?.rewardsUsd);
  });
});

describe("getMarketDowngradingCoefficient", () => {
  it("finds configured market coefficient by original or lower-case address", () => {
    expect(getMarketDowngradingCoefficient({ "0xabc": 50n }, "0xABC")).toBe(50n);
    expect(getMarketDowngradingCoefficient({ "0xABC": 50n }, "0xABC")).toBe(50n);
    expect(getMarketDowngradingCoefficient({ "0xABC": 50n }, "0xabc")).toBe(50n);
  });
});

describe("getEstimatedFeeRewards", () => {
  it("returns 50% of fees after affiliate rebate when points balance is sufficient", () => {
    const feeUsd = 100n * 10n ** USD_DECIMALS;
    const gmxPrice = 20n * 10n ** USD_DECIMALS;
    const pointsBalance = 10n * 10n ** 18n;

    const result = getEstimatedFeeRewards({
      feeUsd,
      totalRebate: 1000n,
      discountShare: 5000n,
      pointsBalance,
      gmxPrice,
    });

    expect(result?.rewardsBasisUsd).toBe(95n * 10n ** USD_DECIMALS);
    expect(result?.rewardsUsd).toBe(475n * 10n ** 29n);
  });

  it("caps rewards by current points balance value", () => {
    const feeUsd = 100n * 10n ** USD_DECIMALS;
    const gmxPrice = 20n * 10n ** USD_DECIMALS;
    const pointsBalance = 1n * 10n ** 18n;

    const result = getEstimatedFeeRewards({
      feeUsd,
      totalRebate: 0n,
      discountShare: 0n,
      pointsBalance,
      gmxPrice,
    });

    expect(result?.rewardsBasisUsd).toBe(100n * 10n ** USD_DECIMALS);
    expect(result?.rewardsUsd).toBe(20n * 10n ** USD_DECIMALS);
  });
});

describe("getEffectiveTradeMultiplier", () => {
  it("adds activity boosts and caps the multiplier", () => {
    const marketInfo = {
      marketTokenAddress: "0xmarket",
      longInterestUsd: 100n * 10n ** USD_DECIMALS,
      shortInterestUsd: 300n * 10n ** USD_DECIMALS,
      useOpenInterestInTokensForBalance: false,
    } as any;

    expect(
      getEffectiveTradeMultiplier({
        multiplier: 325,
        maxMultiplier: 400,
        boosts: [
          { boost: "FeaturedMarkets", multiplier: 50 },
          { boost: "BalancingTrades", multiplier: 50 },
        ],
        featuredMarketTokens: ["0xMARKET"],
        marketInfo,
        isLong: true,
        sizeDeltaUsd: 100n * 10n ** USD_DECIMALS,
        balancingTradesThreshold: 50n * 10n ** USD_DECIMALS,
      })
    ).toBe(400);
  });

  it("normalizes indexer multiplier values before adding boosts", () => {
    expect(
      getEffectiveTradeMultiplier({
        multiplier: "325" as any,
        maxMultiplier: "400" as any,
        boosts: [{ boost: "FeaturedMarkets", multiplier: "50" as any }],
        featuredMarketTokens: ["0xmarket"],
        marketInfo: {
          marketTokenAddress: "0xmarket",
        } as any,
      })
    ).toBe(375);
  });
});

describe("getIsBalancingTrade", () => {
  it("requires the trade to reduce open interest imbalance and meet the configured threshold", () => {
    const marketInfo = {
      longInterestUsd: 100n * 10n ** USD_DECIMALS,
      shortInterestUsd: 300n * 10n ** USD_DECIMALS,
      useOpenInterestInTokensForBalance: false,
    } as any;

    expect(
      getIsBalancingTrade({
        marketInfo,
        isLong: true,
        sizeDeltaUsd: 100n * 10n ** USD_DECIMALS,
        balancingTradesThreshold: 50n * 10n ** USD_DECIMALS,
      })
    ).toBe(true);
    expect(
      getIsBalancingTrade({
        marketInfo,
        isLong: false,
        sizeDeltaUsd: 100n * 10n ** USD_DECIMALS,
        balancingTradesThreshold: 50n * 10n ** USD_DECIMALS,
      })
    ).toBe(false);
    expect(
      getIsBalancingTrade({
        marketInfo,
        isLong: true,
        sizeDeltaUsd: 25n * 10n ** USD_DECIMALS,
        balancingTradesThreshold: 50n * 10n ** USD_DECIMALS,
      })
    ).toBe(false);
  });
});
