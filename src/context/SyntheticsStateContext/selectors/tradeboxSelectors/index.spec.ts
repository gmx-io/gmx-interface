import { describe, expect, it } from "vitest";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import { getTradeboxLeverageSliderMarks } from "domain/synthetics/markets";

describe("tradeboxSelectors", () => {
  it("selectTradeboxLeverageSliderMarks", () => {
    expect(getTradeboxLeverageSliderMarks(15 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 15]);
    expect(getTradeboxLeverageSliderMarks(25 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25]);
    expect(getTradeboxLeverageSliderMarks(50 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50]);
    expect(getTradeboxLeverageSliderMarks(60 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 60]);
    expect(getTradeboxLeverageSliderMarks(70 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 30, 50, 70]);
    expect(getTradeboxLeverageSliderMarks(75 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 30, 50, 75]);
    expect(getTradeboxLeverageSliderMarks(80 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 80]);
    expect(getTradeboxLeverageSliderMarks(90 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 90]);
    expect(getTradeboxLeverageSliderMarks(100 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 100]);

    expect(getTradeboxLeverageSliderMarks(110 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 100, 110]);
    expect(getTradeboxLeverageSliderMarks(120 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 30, 60, 120]);
    expect(getTradeboxLeverageSliderMarks(125 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 100, 125]);

    expect(getTradeboxLeverageSliderMarks(150 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 100, 150]);
  });

  // Off-grid 5x values that the FEDEV-3759 formula can produce (e.g. ZEC 85x). The slider's
  // last mark is its max, so any branch that hard-codes a round value (80/100/110/120) caps
  // input below the contract limit. Keep these explicit so a future regression is caught.
  it("selectTradeboxLeverageSliderMarks — off-grid 5x values", () => {
    expect(getTradeboxLeverageSliderMarks(65 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 65]);
    expect(getTradeboxLeverageSliderMarks(85 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 85]);
    expect(getTradeboxLeverageSliderMarks(95 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 95]);
    expect(getTradeboxLeverageSliderMarks(105 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 105]);
    expect(getTradeboxLeverageSliderMarks(115 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 100, 115]);
  });
});
