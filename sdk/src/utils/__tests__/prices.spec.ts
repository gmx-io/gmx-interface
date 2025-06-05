import { describe, expect, it } from "vitest";

import { OrderType } from "types/orders";
import { TokenPrices } from "types/tokens";
import { TriggerThresholdType } from "types/trade";

import { getMarkPrice, getOrderThresholdType, getShouldUseMaxPrice } from "../prices";

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
    const result = getOrderThresholdType(OrderType.LimitIncrease, true);
    expect(result).toBe(TriggerThresholdType.Below);
  });

  it("returns Above for LimitIncrease when isLong=false", () => {
    const result = getOrderThresholdType(OrderType.LimitIncrease, false);
    expect(result).toBe(TriggerThresholdType.Above);
  });

  it("returns Above for LimitDecrease when isLong=true", () => {
    const result = getOrderThresholdType(OrderType.LimitDecrease, true);
    expect(result).toBe(TriggerThresholdType.Above);
  });

  it("returns Below for LimitDecrease when isLong=false", () => {
    const result = getOrderThresholdType(OrderType.LimitDecrease, false);
    expect(result).toBe(TriggerThresholdType.Below);
  });

  it("returns Below for StopLossDecrease when isLong=true", () => {
    const result = getOrderThresholdType(OrderType.StopLossDecrease, true);
    expect(result).toBe(TriggerThresholdType.Below);
  });

  it("returns Above for StopLossDecrease when isLong=false", () => {
    const result = getOrderThresholdType(OrderType.StopLossDecrease, false);
    expect(result).toBe(TriggerThresholdType.Above);
  });

  it("returns Above for StopMarketIncrease when isLong=true", () => {
    const result = getOrderThresholdType(OrderType.StopIncrease, true);
    expect(result).toBe(TriggerThresholdType.Above);
  });

  it("returns Below for StopMarketIncrease when isLong=false", () => {
    const result = getOrderThresholdType(OrderType.StopIncrease, false);
    expect(result).toBe(TriggerThresholdType.Below);
  });

  it("returns undefined for invalid order type", () => {
    const result = getOrderThresholdType("SomeInvalidType" as unknown as OrderType, true);
    expect(result).toBeUndefined();
  });
});
