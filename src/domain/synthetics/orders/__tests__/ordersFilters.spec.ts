import { describe, expect, it } from "vitest";

import { getIsOrderMatchingTypeFilters } from "../ordersFilters";
import { OrderType } from "../types";

describe("getIsOrderMatchingTypeFilters", () => {
  it.each([
    ["trigger-limit", OrderType.LimitIncrease],
    ["trigger-stop-market", OrderType.StopIncrease],
    ["trigger-take-profit", OrderType.LimitDecrease],
    ["trigger-stop-loss", OrderType.StopLossDecrease],
  ] as const)("matches only its own order type for %s", (filter, orderType) => {
    const isMatching = getIsOrderMatchingTypeFilters([filter]);

    expect(isMatching(orderType, "none")).toBe(true);
    expect(isMatching(orderType, "twap")).toBe(false);

    const otherTriggerTypes = [
      OrderType.LimitIncrease,
      OrderType.StopIncrease,
      OrderType.LimitDecrease,
      OrderType.StopLossDecrease,
    ].filter((type) => type !== orderType);
    otherTriggerTypes.forEach((type) => expect(isMatching(type, "none")).toBe(false));
  });

  it("does not mix the type of one option with the group of another", () => {
    const isMatching = getIsOrderMatchingTypeFilters(["trigger-take-profit", "swaps-twap"]);

    expect(isMatching(OrderType.LimitDecrease, "none")).toBe(true);
    expect(isMatching(OrderType.LimitSwap, "twap")).toBe(true);
    expect(isMatching(OrderType.LimitSwap, "none")).toBe(false);
    expect(isMatching(OrderType.LimitDecrease, "twap")).toBe(false);
  });
});
