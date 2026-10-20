import { describe, expect, it } from "vitest";

import { SECONDS_IN_DAY } from "lib/dates";
import { PRECISION } from "lib/numbers";

import {
  formatEpochLabel,
  formatFactorPercentage,
  formatMultiplier,
  formatMultiplierAdjustment,
  getMaxRewardRateFactor,
  getRecentActivityRewardEstimateUsd,
} from "../utils";

function normalizeRange(value: string) {
  return value
    .replace(/[\u2000-\u200A\u202F\u205F\u00A0]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[–—]/g, "-")
    .trim();
}

describe("Incentives V2 formatting", () => {
  it("formats multipliers using the configured denominator", () => {
    expect(formatMultiplier(150n, 100n)).toBe("1.5x");
    expect(formatMultiplier(150n, 125n)).toBe("1.2x");
    expect(formatMultiplier(0n, 100n)).toBe("0x");
    expect(formatMultiplier(100n, 0n)).toBe("-");
    expect(formatMultiplierAdjustment(50n, 100n)).toBe("+0.5x");
    expect(formatMultiplierAdjustment(0n, 100n)).toBe("0x");
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

  it("estimates recent-activity rewards only for established traders with meaningful fees", () => {
    const nowSeconds = 2_000_000;
    const establishedTradeTimestamp = nowSeconds - 15 * SECONDS_IN_DAY;

    expect(
      getRecentActivityRewardEstimateUsd({
        netPositionFeeUsd: 100n * PRECISION,
        firstTradeTimestamp: establishedTradeTimestamp,
        maxRewardRateFactor: (PRECISION * 12n) / 10n,
        nowSeconds,
      })
    ).toBe(120n * PRECISION);
    expect(
      getRecentActivityRewardEstimateUsd({
        netPositionFeeUsd: 19n * PRECISION,
        firstTradeTimestamp: establishedTradeTimestamp,
        maxRewardRateFactor: PRECISION,
        nowSeconds,
      })
    ).toBeUndefined();
    expect(
      getRecentActivityRewardEstimateUsd({
        netPositionFeeUsd: 100n * PRECISION,
        firstTradeTimestamp: nowSeconds - SECONDS_IN_DAY,
        maxRewardRateFactor: PRECISION,
        nowSeconds,
      })
    ).toBeUndefined();
  });

  it("formats one-day epochs as a single date", () => {
    const epoch = Date.UTC(2026, 3, 7, 0, 0, 0) / 1000;

    expect(normalizeRange(formatEpochLabel(epoch, SECONDS_IN_DAY, "en-US"))).toBe("Apr 7");
  });

  it("formats longer epochs as an inclusive date range", () => {
    const epoch = Date.UTC(2026, 3, 7, 0, 0, 0) / 1000;

    expect(normalizeRange(formatEpochLabel(epoch, 7 * SECONDS_IN_DAY, "en-US"))).toBe("Apr 7 - 13");
    expect(normalizeRange(formatEpochLabel(1_784_678_400, 7 * SECONDS_IN_DAY, "en-US"))).toBe("Jul 22 - 28");
  });

  it("formats sub-day epochs in UTC", () => {
    const epoch = Date.UTC(2026, 3, 7, 9, 0, 0) / 1000;
    const label = normalizeRange(formatEpochLabel(epoch, 60 * 60, "en-US"));

    expect(label).toContain("Apr 7");
    expect(label).toContain("9:00");
    expect(label).toContain("9:59");
  });
});
