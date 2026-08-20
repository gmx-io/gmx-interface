import { describe, expect, it } from "vitest";

import { OrderType } from "utils/orders/types";
import {
  getIncreaseEvaluationIndexPrice,
  getIsIncreaseOrderExecutableNow,
  getMarkPrice,
  getOrderThresholdType,
  getShouldUseMaxPrice,
} from "utils/prices";
import { TokenPrices } from "utils/tokens/types";
import { TriggerThresholdType } from "utils/trade/types";

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

describe("getIsIncreaseOrderExecutableNow", () => {
  const prices: TokenPrices = { minPrice: 1000n, maxPrice: 1100n };

  it("is always true for a market increase, regardless of the trigger price", () => {
    expect(
      getIsIncreaseOrderExecutableNow({
        orderType: OrderType.MarketIncrease,
        isLong: true,
        triggerPrice: undefined,
        indexTokenPrices: prices,
      })
    ).toBe(true);
  });

  it("is false without a usable trigger price", () => {
    for (const triggerPrice of [undefined, 0n, -1n]) {
      expect(
        getIsIncreaseOrderExecutableNow({
          orderType: OrderType.LimitIncrease,
          isLong: true,
          triggerPrice,
          indexTokenPrices: prices,
        })
      ).toBe(false);
    }
  });

  it("is false for order types that are not increases", () => {
    expect(
      getIsIncreaseOrderExecutableNow({
        orderType: OrderType.LimitDecrease,
        isLong: true,
        triggerPrice: 5000n,
        indexTokenPrices: prices,
      })
    ).toBe(false);

    expect(
      getIsIncreaseOrderExecutableNow({
        orderType: undefined,
        isLong: true,
        triggerPrice: 5000n,
        indexTokenPrices: prices,
      })
    ).toBe(false);
  });

  // a long limit increase buys at maxPrice, so it triggers once the max price falls to the trigger
  it.each([
    ["long, max above the trigger", true, 1099n, false],
    ["long, max exactly at the trigger", true, 1100n, true],
    ["long, max below the trigger", true, 1101n, true],
    // a short limit increase sells at minPrice, so it triggers once the min price rises to the trigger
    ["short, min below the trigger", false, 1001n, false],
    ["short, min exactly at the trigger", false, 1000n, true],
    ["short, min above the trigger", false, 999n, true],
  ])("LimitIncrease — %s", (_name, isLong, triggerPrice, expected) => {
    expect(
      getIsIncreaseOrderExecutableNow({
        orderType: OrderType.LimitIncrease,
        isLong,
        triggerPrice,
        indexTokenPrices: prices,
      })
    ).toBe(expected);
  });

  it.each([
    ["long, max below the trigger", true, 1101n, false],
    ["long, max exactly at the trigger", true, 1100n, true],
    ["long, max above the trigger", true, 1099n, true],
    ["short, min above the trigger", false, 999n, false],
    ["short, min exactly at the trigger", false, 1000n, true],
    ["short, min below the trigger", false, 1001n, true],
  ])("StopIncrease — %s", (_name, isLong, triggerPrice, expected) => {
    expect(
      getIsIncreaseOrderExecutableNow({
        orderType: OrderType.StopIncrease,
        isLong,
        triggerPrice,
        indexTokenPrices: prices,
      })
    ).toBe(expected);
  });
});

describe("getIncreaseEvaluationIndexPrice", () => {
  const prices = { minPrice: 1000n, maxPrice: 1100n };

  it("keeps current prices for a market increase", () => {
    expect(
      getIncreaseEvaluationIndexPrice({
        orderType: OrderType.MarketIncrease,
        isLong: true,
        triggerPrice: undefined,
        indexTokenPrices: prices,
      })
    ).toBeUndefined();
  });

  it("keeps current prices without a usable trigger price", () => {
    for (const triggerPrice of [undefined, 0n, -1n]) {
      expect(
        getIncreaseEvaluationIndexPrice({
          orderType: OrderType.LimitIncrease,
          isLong: true,
          triggerPrice,
          indexTokenPrices: prices,
        })
      ).toBeUndefined();
    }
  });

  it.each([
    // a resting order is predicted at its trigger; an executable-now order at current prices
    [OrderType.LimitIncrease, true, 900n, 900n],
    [OrderType.LimitIncrease, true, 1200n, undefined],
    [OrderType.LimitIncrease, false, 1200n, 1200n],
    [OrderType.LimitIncrease, false, 900n, undefined],
    [OrderType.StopIncrease, true, 1200n, 1200n],
    [OrderType.StopIncrease, true, 900n, undefined],
    [OrderType.StopIncrease, false, 900n, 900n],
    [OrderType.StopIncrease, false, 1200n, undefined],
  ])("orderType=%s isLong=%s trigger=%s → %s", (orderType, isLong, triggerPrice, expected) => {
    expect(
      getIncreaseEvaluationIndexPrice({ orderType, isLong, triggerPrice, indexTokenPrices: prices })
    ).toBe(expected);
  });
});
