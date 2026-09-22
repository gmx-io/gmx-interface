import { describe, expect, it } from "vitest";

import { PRECISION } from "lib/numbers";

import { formatFactorPercentage, formatMultiplier, formatMultiplierAdjustment, getMaxRewardRateFactor } from "../utils";

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
