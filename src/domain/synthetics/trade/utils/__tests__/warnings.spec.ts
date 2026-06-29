import { describe, expect, it } from "vitest";

import { getIsPositionLiquidatableAtPrice } from "../warnings";

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
