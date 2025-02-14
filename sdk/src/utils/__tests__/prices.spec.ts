import { describe, expect, it } from "vitest";

import { getMarkPrice, getShouldUseMaxPrice, getTriggerThresholdType } from "../prices";
import { OrderType } from "types/orders";
import { TokenPrices } from "types/tokens";
import { TriggerThresholdType } from "types/trade";

describe("getMarkPrice", () => {
  it("returns maxPrice if getShouldUseMaxPrice => true", () => {
    const prices: TokenPrices = { minPrice: 1000n, maxPrice: 1500n };
    // isIncrease=true, isLong=true => getShouldUseMaxPrice => true
    const result = getMarkPrice({ prices, isIncrease: true, isLong: true });
    expect(result).toBe(1500n);
  });

  it("returns minPrice if getShouldUseMaxPrice => false", () => {
    const prices: TokenPrices = { minPrice: 1000n, maxPrice: 1500n };
    // isIncrease=false, isLong=true => getShouldUseMaxPrice => false
    const result = getMarkPrice({ prices, isIncrease: false, isLong: true });
    expect(result).toBe(1000n);
  });
});

describe("getShouldUseMaxPrice", () => {
  it("returns isLong if isIncrease=true", () => {
    // isIncrease=true => return isLong
    expect(getShouldUseMaxPrice(true, true)).toBe(true);
    expect(getShouldUseMaxPrice(true, false)).toBe(false);
  });

  it("returns !isLong if isIncrease=false", () => {
    // isIncrease=false => return !isLong
    expect(getShouldUseMaxPrice(false, true)).toBe(false);
    expect(getShouldUseMaxPrice(false, false)).toBe(true);
  });
});

describe("getTriggerThresholdType", () => {
  it("returns Below for LimitIncrease when isLong=true", () => {
    const result = getTriggerThresholdType(OrderType.LimitIncrease, true);
    expect(result).toBe(TriggerThresholdType.Below);
  });

  it("returns Above for LimitIncrease when isLong=false", () => {
    const result = getTriggerThresholdType(OrderType.LimitIncrease, false);
    expect(result).toBe(TriggerThresholdType.Above);
  });

  it("returns Above for LimitDecrease when isLong=true", () => {
    const result = getTriggerThresholdType(OrderType.LimitDecrease, true);
    expect(result).toBe(TriggerThresholdType.Above);
  });

  it("returns Below for LimitDecrease when isLong=false", () => {
    const result = getTriggerThresholdType(OrderType.LimitDecrease, false);
    expect(result).toBe(TriggerThresholdType.Below);
  });

  it("returns Below for StopLossDecrease when isLong=true", () => {
    const result = getTriggerThresholdType(OrderType.StopLossDecrease, true);
    expect(result).toBe(TriggerThresholdType.Below);
  });

  it("returns Above for StopLossDecrease when isLong=false", () => {
    const result = getTriggerThresholdType(OrderType.StopLossDecrease, false);
    expect(result).toBe(TriggerThresholdType.Above);
  });

  it("throws error for invalid order type", () => {
    expect(() => getTriggerThresholdType("SomeInvalidType" as unknown as OrderType, true)).toThrow(
      "Invalid trigger order type"
    );
  });
});
