import { describe, expect, it } from "vitest";

import { DecreasePositionSwapType, OrderType, type PositionOrderInfo } from "domain/synthetics/orders";
import type { PositionInfo } from "domain/synthetics/positions";
import { expandDecimals, MaxUint256 } from "lib/numbers";

import { getInlineTpDecreaseSwapType, MAX_PERCENTAGE, prepareInitialEntries } from "../utils";

describe("prepareInitialEntries", () => {
  const positionSizeUsd = expandDecimals(1000, 30);
  const triggerPrice = expandDecimals(5000, 30);

  function makeOrder(sizeDeltaUsd: bigint) {
    return {
      sizeDeltaUsd,
      triggerPrice,
    } as unknown as PositionOrderInfo;
  }

  it("keeps only full-close orders when requested", () => {
    const entries = prepareInitialEntries({
      positionOrders: [makeOrder(expandDecimals(500, 30)), makeOrder(MaxUint256)],
      sort: "desc",
      positionSizeUsd,
      onlyFullPositionClose: true,
    });

    expect(entries).toHaveLength(1);
    expect(entries?.[0].sizeUsd.value).toBe(positionSizeUsd);
    expect(entries?.[0].percentage?.value).toBe(MAX_PERCENTAGE);
    expect(entries?.[0].mode).toBe("keepPercentage");
  });

  it("marks current-position-sized orders as percentage-based full close", () => {
    const entries = prepareInitialEntries({
      positionOrders: [makeOrder(positionSizeUsd)],
      sort: "desc",
      positionSizeUsd,
      onlyFullPositionClose: true,
    });

    expect(entries).toHaveLength(1);
    expect(entries?.[0].percentage?.value).toBe(MAX_PERCENTAGE);
    expect(entries?.[0].mode).toBe("keepPercentage");
  });
});

describe("getInlineTpDecreaseSwapType", () => {
  const tokenA = { address: "0x0000000000000000000000000000000000000001", symbol: "A" };
  const tokenB = { address: "0x0000000000000000000000000000000000000002", symbol: "B" };
  const splitablePosition = { pnlToken: tokenA, collateralToken: tokenB } as unknown as PositionInfo;
  const sameTokenPosition = { pnlToken: tokenA, collateralToken: tokenA } as unknown as PositionInfo;

  it("returns NoSwap for a TP order when PnL and collateral tokens differ", () => {
    expect(getInlineTpDecreaseSwapType(OrderType.LimitDecrease, splitablePosition)).toBe(
      DecreasePositionSwapType.NoSwap
    );
  });

  it("returns undefined for a TP order when PnL and collateral tokens are equivalent", () => {
    expect(getInlineTpDecreaseSwapType(OrderType.LimitDecrease, sameTokenPosition)).toBeUndefined();
  });

  it("returns undefined for an SL order even when PnL and collateral tokens differ", () => {
    expect(getInlineTpDecreaseSwapType(OrderType.StopLossDecrease, splitablePosition)).toBeUndefined();
  });

  it("returns undefined when the position is undefined", () => {
    expect(getInlineTpDecreaseSwapType(OrderType.LimitDecrease, undefined)).toBeUndefined();
  });
});
