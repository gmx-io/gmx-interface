import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";

import { getRewardsSliderAmount, getRewardsSliderStops } from "./rewardsSlider";

describe("rewards slider amounts", () => {
  it.each([18, 30])("selects whole amounts throughout the range with %s token decimals", (decimals) => {
    const unit = expandDecimals(1, decimals);
    const stops = getRewardsSliderStops(
      [10n, 100n, 1_000n, 10_000n, 50_000n].map((value) => ({ threshold: value * unit }))
    );
    let previous = 0n;

    for (let position = 0; position <= 500; position++) {
      const amount = getRewardsSliderAmount(stops, position, decimals);
      expect(amount % unit).toBe(0n);
      expect(amount).toBeGreaterThanOrEqual(previous);
      previous = amount;
    }

    expect(getRewardsSliderAmount(stops, 0, decimals)).toBe(0n);
    expect(previous).toBe(50_000n * unit);
  });
});
