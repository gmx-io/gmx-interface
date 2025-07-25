import { describe, expect, it } from "vitest";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import { getTradeboxLeverageSliderMarks } from "domain/synthetics/markets";

describe("tradeboxSelectors", () => {
  it("selectTradeboxLeverageSliderMarks", () => {
    expect(getTradeboxLeverageSliderMarks(100 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 5, 25, 37.5, 50]);
    expect(getTradeboxLeverageSliderMarks(120 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 5, 30, 45, 60]);
    expect(getTradeboxLeverageSliderMarks(140 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 5, 30, 45, 70]);
    expect(getTradeboxLeverageSliderMarks(150 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 10, 40, 60, 75]);
    expect(getTradeboxLeverageSliderMarks(160 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 10, 40, 60, 80]);
    expect(getTradeboxLeverageSliderMarks(180 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 10, 50, 75, 90]);
    expect(getTradeboxLeverageSliderMarks(200 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 10, 50, 75, 100]);

    expect(getTradeboxLeverageSliderMarks(220 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 10, 50, 75, 110]);
    expect(getTradeboxLeverageSliderMarks(240 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 10, 60, 90, 120]);
    expect(getTradeboxLeverageSliderMarks(250 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 10, 60, 90, 125]);
    expect(getTradeboxLeverageSliderMarks(300 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 10, 60, 90, 150]);
  });
});
