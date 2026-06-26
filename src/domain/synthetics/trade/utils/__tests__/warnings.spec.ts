import { describe, expect, it } from "vitest";

import { getIsPositionLiquidatableAtPrice, getIsResultingPositionLiquidatable } from "../warnings";

describe("getIsPositionLiquidatableAtPrice", () => {
  it("long: liquidatable when liqPrice is above the price", () => {
    expect(getIsPositionLiquidatableAtPrice({ liqPrice: 110n, price: 100n, isLong: true })).toBe(true);
  });

  it("long: not liquidatable when liqPrice is below the price", () => {
    expect(getIsPositionLiquidatableAtPrice({ liqPrice: 90n, price: 100n, isLong: true })).toBe(false);
  });

  it("long: not liquidatable at exact equality", () => {
    expect(getIsPositionLiquidatableAtPrice({ liqPrice: 100n, price: 100n, isLong: true })).toBe(false);
  });

  it("short: liquidatable when liqPrice is below the price", () => {
    expect(getIsPositionLiquidatableAtPrice({ liqPrice: 90n, price: 100n, isLong: false })).toBe(true);
  });

  it("short: not liquidatable when liqPrice is above the price", () => {
    expect(getIsPositionLiquidatableAtPrice({ liqPrice: 110n, price: 100n, isLong: false })).toBe(false);
  });

  it("short: not liquidatable at exact equality", () => {
    expect(getIsPositionLiquidatableAtPrice({ liqPrice: 100n, price: 100n, isLong: false })).toBe(false);
  });

  it("returns false when liqPrice is undefined", () => {
    expect(getIsPositionLiquidatableAtPrice({ liqPrice: undefined, price: 100n, isLong: true })).toBe(false);
  });

  it("returns false when price is undefined", () => {
    expect(getIsPositionLiquidatableAtPrice({ liqPrice: 100n, price: undefined, isLong: true })).toBe(false);
  });
});

// Fixture math:
//   PRECISION = 1e30
//   minCollateralFactorForLiquidation = 10n ** 28n  (= 1% of 1e30)
//   nextSizeUsd = 10_000n
//   maintenanceUsd = applyFactor(10_000n, 1e28n) = 10_000n * 1e28n / 1e30n = 100n
//   minCollateralUsd = 50n  (below maintenanceUsd, so factor dominates unless noted)
//   requiredUsd = max(100n, 50n) = 100n
//   requiredWithBuffer = 100n * 10_500n / 10_000n = 105n  (strict <, so 105n is NOT liquidatable)
describe("getIsResultingPositionLiquidatable", () => {
  const SIZE = 10_000n;
  // 1% factor: SIZE * FACTOR / 1e30 = 10_000 * 1e28 / 1e30 = 100
  const FACTOR_1PCT = 10n ** 28n;
  const MIN_COLLATERAL = 50n; // below maintenanceUsd; factor dominates
  // requiredUsd = 100n, requiredWithBuffer = 105n

  it("returns true when collateral+pnl is below required (under-collateralized)", () => {
    // nextCollateralUsd + nextPnl = 90n < 105n → liquidatable
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 90n,
        nextPnl: 0n,
        nextSizeUsd: SIZE,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: MIN_COLLATERAL,
      })
    ).toBe(true);
  });

  it("returns true when negative pnl eats the buffer (value between required and required×1.05)", () => {
    // nextCollateralUsd + nextPnl = 120n + (-18n) = 102n; 100n < 102n < 105n → still liquidatable
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 120n,
        nextPnl: -18n,
        nextSizeUsd: SIZE,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: MIN_COLLATERAL,
      })
    ).toBe(true);
  });

  it("returns false when comfortably above requiredWithBuffer", () => {
    // nextCollateralUsd + nextPnl = 200n > 105n → not liquidatable
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 200n,
        nextPnl: 0n,
        nextSizeUsd: SIZE,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: MIN_COLLATERAL,
      })
    ).toBe(false);
  });

  it("returns false at exact boundary (requiredWithBuffer = 105n, strict <)", () => {
    // nextCollateralUsd + nextPnl = 105n = requiredWithBuffer → not liquidatable (strict <)
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 105n,
        nextPnl: 0n,
        nextSizeUsd: SIZE,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: MIN_COLLATERAL,
      })
    ).toBe(false);
  });

  it("returns true when minCollateralUsd floor dominates for tiny size", () => {
    // nextSizeUsd = 1n → maintenanceUsd = 1n * 1e28 / 1e30 = 0n (truncated)
    // minCollateralUsd = 200n > 0n → requiredUsd = 200n → requiredWithBuffer = 210n
    // nextCollateralUsd + nextPnl = 100n < 210n → liquidatable
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 100n,
        nextPnl: 0n,
        nextSizeUsd: 1n,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: 200n,
      })
    ).toBe(true);
  });

  it("returns false when minCollateralUsd floor is satisfied", () => {
    // minCollateralUsd = 200n dominates, requiredWithBuffer = 210n
    // nextCollateralUsd + nextPnl = 300n > 210n → not liquidatable
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 300n,
        nextPnl: 0n,
        nextSizeUsd: 1n,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: 200n,
      })
    ).toBe(false);
  });

  it("returns false when nextCollateralUsd is undefined", () => {
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: undefined,
        nextPnl: 0n,
        nextSizeUsd: SIZE,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: MIN_COLLATERAL,
      })
    ).toBe(false);
  });

  it("returns false when nextPnl is undefined", () => {
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 90n,
        nextPnl: undefined,
        nextSizeUsd: SIZE,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: MIN_COLLATERAL,
      })
    ).toBe(false);
  });

  it("returns false when nextSizeUsd is undefined", () => {
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 90n,
        nextPnl: 0n,
        nextSizeUsd: undefined,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: MIN_COLLATERAL,
      })
    ).toBe(false);
  });

  it("returns false when minCollateralFactorForLiquidation is undefined", () => {
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 90n,
        nextPnl: 0n,
        nextSizeUsd: SIZE,
        minCollateralFactorForLiquidation: undefined,
        minCollateralUsd: MIN_COLLATERAL,
      })
    ).toBe(false);
  });

  it("returns false when minCollateralUsd is undefined", () => {
    expect(
      getIsResultingPositionLiquidatable({
        nextCollateralUsd: 90n,
        nextPnl: 0n,
        nextSizeUsd: SIZE,
        minCollateralFactorForLiquidation: FACTOR_1PCT,
        minCollateralUsd: undefined,
      })
    ).toBe(false);
  });
});
