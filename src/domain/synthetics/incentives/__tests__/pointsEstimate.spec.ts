import { describe, expect, it } from "vitest";

import {
  DEFAULT_DOWNGRADING_COEFFICIENT,
  getEstimatedTradeRewards,
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
