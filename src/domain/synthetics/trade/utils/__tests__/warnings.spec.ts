import { describe, expect, it } from "vitest";

import {
  getIsIncreaseResultingPositionLiquidatable,
  getIsPositionLiquidatableAtPrice,
  getIsPositionLiquidatedBeforeTrigger,
} from "../warnings";

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

describe("getIsPositionLiquidatedBeforeTrigger", () => {
  it("long: flags when the liq price is above the trigger price", () => {
    expect(getIsPositionLiquidatedBeforeTrigger({ liqPrice: 110n, triggerPrice: 100n, isLong: true })).toBe(true);
  });

  it("long: does not flag when the liq price is below the trigger price", () => {
    expect(getIsPositionLiquidatedBeforeTrigger({ liqPrice: 90n, triggerPrice: 100n, isLong: true })).toBe(false);
  });

  it("short: flags when the liq price is below the trigger price", () => {
    expect(getIsPositionLiquidatedBeforeTrigger({ liqPrice: 90n, triggerPrice: 100n, isLong: false })).toBe(true);
  });

  it("short: does not flag when the liq price is above the trigger price", () => {
    expect(getIsPositionLiquidatedBeforeTrigger({ liqPrice: 110n, triggerPrice: 100n, isLong: false })).toBe(false);
  });

  it("does not flag without a position or a trigger price", () => {
    expect(getIsPositionLiquidatedBeforeTrigger({ liqPrice: undefined, triggerPrice: 100n, isLong: true })).toBe(false);
    expect(getIsPositionLiquidatedBeforeTrigger({ liqPrice: 110n, triggerPrice: undefined, isLong: true })).toBe(false);
  });
});

describe("getIsIncreaseResultingPositionLiquidatable", () => {
  it("long: flags when the resulting liq price is beyond the trigger price", () => {
    expect(
      getIsIncreaseResultingPositionLiquidatable({
        currentLiqPrice: 80n,
        nextLiqPrice: 110n,
        triggerPrice: 100n,
        isLong: true,
      })
    ).toBe(true);
  });

  it("long: does not flag when the resulting liq price stays below the trigger price", () => {
    expect(
      getIsIncreaseResultingPositionLiquidatable({
        currentLiqPrice: 80n,
        nextLiqPrice: 90n,
        triggerPrice: 100n,
        isLong: true,
      })
    ).toBe(false);
  });

  it("long: does not flag when the current position would be liquidated before the trigger", () => {
    expect(
      getIsIncreaseResultingPositionLiquidatable({
        currentLiqPrice: 110n,
        nextLiqPrice: 120n,
        triggerPrice: 100n,
        isLong: true,
      })
    ).toBe(false);
  });

  it("short: flags when the resulting liq price is beyond the trigger price", () => {
    expect(
      getIsIncreaseResultingPositionLiquidatable({
        currentLiqPrice: 120n,
        nextLiqPrice: 90n,
        triggerPrice: 100n,
        isLong: false,
      })
    ).toBe(true);
  });

  it("short: does not flag when the current position would be liquidated before the trigger", () => {
    expect(
      getIsIncreaseResultingPositionLiquidatable({
        currentLiqPrice: 90n,
        nextLiqPrice: 80n,
        triggerPrice: 100n,
        isLong: false,
      })
    ).toBe(false);
  });

  it("checks a fresh position (no current liq price) against the resulting liq price", () => {
    expect(
      getIsIncreaseResultingPositionLiquidatable({
        currentLiqPrice: undefined,
        nextLiqPrice: 110n,
        triggerPrice: 100n,
        isLong: true,
      })
    ).toBe(true);
  });

  it("returns false when nextLiqPrice is undefined", () => {
    expect(
      getIsIncreaseResultingPositionLiquidatable({
        currentLiqPrice: 80n,
        nextLiqPrice: undefined,
        triggerPrice: 100n,
        isLong: true,
      })
    ).toBe(false);
  });

  it("returns false when triggerPrice is undefined", () => {
    expect(
      getIsIncreaseResultingPositionLiquidatable({
        currentLiqPrice: 80n,
        nextLiqPrice: 110n,
        triggerPrice: undefined,
        isLong: true,
      })
    ).toBe(false);
  });
});
