import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";
import { OrderType } from "sdk/utils/orders/types";
import type { BatchOrderTxnParams } from "sdk/utils/orderTransactions";

import { getIsSizeIncreaseBatch } from "../getIsSizeIncreaseBatch";

function batchWith(orders: { orderType: OrderType; sizeDeltaUsd: bigint }[]) {
  return {
    createOrderParams: orders.map((o) => ({
      orderPayload: { orderType: o.orderType, numbers: { sizeDeltaUsd: o.sizeDeltaUsd } },
    })),
  } as unknown as BatchOrderTxnParams;
}

describe("getIsSizeIncreaseBatch", () => {
  it("is true for a market increase with size", () => {
    expect(
      getIsSizeIncreaseBatch(batchWith([{ orderType: OrderType.MarketIncrease, sizeDeltaUsd: expandDecimals(1, 30) }]))
    ).toBe(true);
  });

  it("is false for a pure collateral deposit", () => {
    expect(getIsSizeIncreaseBatch(batchWith([{ orderType: OrderType.MarketIncrease, sizeDeltaUsd: 0n }]))).toBe(false);
  });

  it("is false for decreases and for an empty batch", () => {
    expect(
      getIsSizeIncreaseBatch(batchWith([{ orderType: OrderType.MarketDecrease, sizeDeltaUsd: expandDecimals(1, 30) }]))
    ).toBe(false);
    expect(getIsSizeIncreaseBatch(batchWith([]))).toBe(false);
  });

  it("is true when a size increase travels with its take-profit and stop-loss", () => {
    expect(
      getIsSizeIncreaseBatch(
        batchWith([
          { orderType: OrderType.LimitIncrease, sizeDeltaUsd: expandDecimals(1, 30) },
          { orderType: OrderType.LimitDecrease, sizeDeltaUsd: expandDecimals(1, 30) },
          { orderType: OrderType.StopLossDecrease, sizeDeltaUsd: expandDecimals(1, 30) },
        ])
      )
    ).toBe(true);
  });
});
