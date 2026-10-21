import { describe, expect, it } from "vitest";

import { PRECISION } from "lib/numbers";

import {
  formatFactorPercentage,
  formatMultiplier,
  formatMultiplierAdjustment,
  getMaxRewardRateFactor,
  getPreviousEpochRewardBreakdown,
} from "../utils";

describe("Rewards landing data", () => {
  it("formats multipliers using the configured denominator", () => {
    expect(formatMultiplier(150n, 100n)).toBe("1.5x");
    expect(formatMultiplier(150n, 125n)).toBe("1.2x");
    expect(formatMultiplier(0n, 100n)).toBe("0x");
    expect(formatMultiplier(100n, 0n)).toBe("-");
    expect(formatMultiplierAdjustment(50n, 100n)).toBe("+0.5x");
    expect(formatMultiplierAdjustment(0n, 100n)).toBe("0x");
  });

  it("does not display a rounded-up multiplier as the exact maximum", () => {
    expect(formatMultiplier(9994n, 1000n, 2, 10_000n)).toBe("9.99x");
    expect(formatMultiplier(9995n, 1000n, 2, 10_000n)).toBe("<10x");
    expect(formatMultiplier(10_000n, 1000n, 2, 10_000n)).toBe("10x");
    expect(formatMultiplier(9995n, 1000n)).toBe("10x");
  });

  it("derives the configured maximum combined reward rate", () => {
    const factor = getMaxRewardRateFactor({
      feeShareFactor: PRECISION / 10n,
      esGmxShareFactor: PRECISION,
      gtShareFactor: PRECISION / 5n,
      maxMultiplier: 1000n,
      multiplierDecimals: 100n,
    });

    expect(formatFactorPercentage(factor)).toBe("120%");
  });
});

describe("Previous epoch reward breakdown", () => {
  const config = {
    epochTimestamp: 21 * 86400,
    epochStartTimestamp: 7 * 86400,
    epochDuration: 7 * 86400,
    esGmxShareFactor: PRECISION,
    gtShareFactor: PRECISION / 5n,
  };

  it.each([
    [
      "splits by the configured shares",
      1200n * PRECISION,
      config,
      { esGmxUsd: 1000n * PRECISION, gtUsd: 200n * PRECISION },
    ],
    [
      "keeps USD precision",
      1200n * PRECISION + 1n,
      config,
      { esGmxUsd: 1000n * PRECISION, gtUsd: 200n * PRECISION + 1n },
    ],
    [
      "skips rewards from before the config",
      PRECISION,
      { ...config, epochStartTimestamp: config.epochTimestamp },
      undefined,
    ],
    [
      "applies a config that covers the previous epoch",
      1200n * PRECISION,
      { ...config, epochStartTimestamp: config.epochTimestamp - config.epochDuration },
      { esGmxUsd: 1000n * PRECISION, gtUsd: 200n * PRECISION },
    ],
    ["supports zero rewards", 0n, config, { esGmxUsd: 0n, gtUsd: 0n }],
    ["supports a single reward token", PRECISION, { ...config, gtShareFactor: 0n }, { esGmxUsd: PRECISION, gtUsd: 0n }],
    ["does not divide by zero shares", PRECISION, { ...config, esGmxShareFactor: 0n, gtShareFactor: 0n }, undefined],
  ])("%s", (_, rewardsUsd, breakdownConfig, expected) => {
    expect(getPreviousEpochRewardBreakdown(rewardsUsd, breakdownConfig)).toEqual(expected);
  });
});
