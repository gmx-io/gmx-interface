import { describe, expect, it } from "vitest";

import { correctLiquidationPrice, type CorrectLiquidationPriceInput } from "./correctLiquidationPrice";

const ONE_USD = 10n ** 20n;

const base: CorrectLiquidationPriceInput = {
  liquidationPrice: 100n * ONE_USD,
  sizeInUsd: 10_000n * ONE_USD,
  sizeInTokens: 1_000n,
  collateralAmount: 200n,
  isLong: true,
  isCollateralIndexToken: false,
  minCollateralFactor: 1n * 10n ** 18n, // 1%
  minCollateralFactorForLiquidation: 2n * 10n ** 18n, // 2%
};

describe("correctLiquidationPrice", () => {
  it("returns undefined without an SDK liquidation price", () => {
    expect(correctLiquidationPrice({ ...base, liquidationPrice: undefined })).toBeUndefined();
  });

  it("keeps the price when both factors are equal", () => {
    expect(correctLiquidationPrice({ ...base, minCollateralFactorForLiquidation: base.minCollateralFactor })).toBe(
      base.liquidationPrice
    );
  });

  it("keeps the price when size in tokens is zero", () => {
    expect(correctLiquidationPrice({ ...base, sizeInTokens: 0n })).toBe(base.liquidationPrice);
  });

  it("raises the long liquidation price when the liquidation factor is higher", () => {
    // deltaCollateral = 10_000 USD * 1% = 100 USD; denominator = sizeInTokens = 1000
    const expected = base.liquidationPrice! + (100n * ONE_USD) / 1_000n;
    expect(correctLiquidationPrice(base)).toBe(expected);
  });

  it("lowers the short liquidation price (negative denominator)", () => {
    const expected = base.liquidationPrice! - (100n * ONE_USD) / 1_000n;
    expect(correctLiquidationPrice({ ...base, isLong: false })).toBe(expected);
  });

  it("uses size ± collateral as denominator when collateral is the index token", () => {
    const long = correctLiquidationPrice({ ...base, isCollateralIndexToken: true });
    expect(long).toBe(base.liquidationPrice! + (100n * ONE_USD) / 1_200n);
    const short = correctLiquidationPrice({ ...base, isCollateralIndexToken: true, isLong: false });
    expect(short).toBe(base.liquidationPrice! + (100n * ONE_USD) / 800n);
  });

  it("keeps the price when the denominator is zero", () => {
    expect(
      correctLiquidationPrice({ ...base, isCollateralIndexToken: true, isLong: false, collateralAmount: 1_000n })
    ).toBe(base.liquidationPrice);
  });

  it("returns undefined when the corrected price is not positive", () => {
    expect(correctLiquidationPrice({ ...base, isLong: false, liquidationPrice: 1n })).toBeUndefined();
  });
});
