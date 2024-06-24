import { BASIS_POINTS_DIVISOR } from "config/factors";
import { getMaxLeverageByMinCollateralFactor } from "./markets";

describe("domain/synthetics/utils", () => {
  it("getMaxLeverageByMinCollateralFactor", () => {
    expect(getMaxLeverageByMinCollateralFactor(undefined)).toBe(100 * BASIS_POINTS_DIVISOR);
    expect(getMaxLeverageByMinCollateralFactor(0n)).toBe(100 * BASIS_POINTS_DIVISOR);

    expect(getMaxLeverageByMinCollateralFactor(10000000000000000000000000000n)).toBe(100 * BASIS_POINTS_DIVISOR);

    expect(getMaxLeverageByMinCollateralFactor(6666666666666666666666666666n)).toBe(150 * BASIS_POINTS_DIVISOR);
    expect(getMaxLeverageByMinCollateralFactor(6660000000000000000000000000n)).toBe(150 * BASIS_POINTS_DIVISOR);
    expect(getMaxLeverageByMinCollateralFactor(6670000000000000000000000000n)).toBe(150 * BASIS_POINTS_DIVISOR);

    expect(getMaxLeverageByMinCollateralFactor(5000000000000000000000000000n)).toBe(200 * BASIS_POINTS_DIVISOR);
    expect(getMaxLeverageByMinCollateralFactor(4999999999999999999999999999n)).toBe(200 * BASIS_POINTS_DIVISOR);

    expect(getMaxLeverageByMinCollateralFactor(8333333333333333333333333333n)).toBe(120 * BASIS_POINTS_DIVISOR);
    expect(getMaxLeverageByMinCollateralFactor(8330000000000000000000000000n)).toBe(120 * BASIS_POINTS_DIVISOR);

    expect(getMaxLeverageByMinCollateralFactor(4000000000000000000000000000n)).toBe(250 * BASIS_POINTS_DIVISOR);
  });
});
