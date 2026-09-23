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

  it("formats 30-decimal factors as percentages", () => {
    expect(formatFactorPercentage(PRECISION / 2n)).toBe("50%");
    expect(formatFactorPercentage((PRECISION * 1234n) / 10_000n, 2)).toBe("12.34%");
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

  it("splits combined rewards by the configured shares without losing USD precision", () => {
    expect(getPreviousEpochRewardBreakdown(1200n * PRECISION, config)).toEqual({
      esGmxUsd: 1000n * PRECISION,
      gtUsd: 200n * PRECISION,
    });
    const breakdown = getPreviousEpochRewardBreakdown(1200n * PRECISION + 1n, config)!;
    expect(breakdown.esGmxUsd + breakdown.gtUsd).toBe(1200n * PRECISION + 1n);
  });

  it("does not apply a new config to rewards from an earlier epoch", () => {
    expect(getPreviousEpochRewardBreakdown(PRECISION, { ...config, epochStartTimestamp: config.epochTimestamp })).toBe(
      undefined
    );
    expect(
      getPreviousEpochRewardBreakdown(PRECISION, {
        ...config,
        epochStartTimestamp: config.epochTimestamp - config.epochDuration,
      })
    ).toBeDefined();
  });

  it("supports zero rewards and a single reward token", () => {
    expect(getPreviousEpochRewardBreakdown(0n, config)).toEqual({ esGmxUsd: 0n, gtUsd: 0n });
    expect(getPreviousEpochRewardBreakdown(PRECISION, { ...config, gtShareFactor: 0n })).toEqual({
      esGmxUsd: PRECISION,
      gtUsd: 0n,
    });
  });

  it("does not divide by zero when both token shares are zero", () => {
    expect(getPreviousEpochRewardBreakdown(PRECISION, { ...config, esGmxShareFactor: 0n, gtShareFactor: 0n })).toBe(
      undefined
    );
  });
});
