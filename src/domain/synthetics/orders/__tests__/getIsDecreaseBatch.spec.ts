import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";
import { OrderType } from "sdk/utils/orders/types";
import type { BatchOrderTxnParams } from "sdk/utils/orderTransactions";

import { getIsDecreaseBatch } from "../getIsDecreaseBatch";

function batchWith(orders: { orderType: OrderType; sizeDeltaUsd: bigint }[]) {
  return {
    createOrderParams: orders.map((o) => ({
      orderPayload: { orderType: o.orderType, numbers: { sizeDeltaUsd: o.sizeDeltaUsd } },
    })),
  } as unknown as BatchOrderTxnParams;
}

describe("getIsDecreaseBatch", () => {
  it("is true for a market partial close", () => {
    expect(
      getIsDecreaseBatch(batchWith([{ orderType: OrderType.MarketDecrease, sizeDeltaUsd: expandDecimals(1, 30) }]))
    ).toBe(true);
  });

  it("is true for a pure collateral withdrawal", () => {
    expect(getIsDecreaseBatch(batchWith([{ orderType: OrderType.MarketDecrease, sizeDeltaUsd: 0n }]))).toBe(true);
  });

  it("is false for a collateral deposit and for an empty batch", () => {
    expect(getIsDecreaseBatch(batchWith([{ orderType: OrderType.MarketIncrease, sizeDeltaUsd: 0n }]))).toBe(false);
    expect(getIsDecreaseBatch(batchWith([]))).toBe(false);
  });

  it("is false when the decreases are the take-profit and stop-loss of a size increase", () => {
    expect(
      getIsDecreaseBatch(
        batchWith([
          { orderType: OrderType.LimitIncrease, sizeDeltaUsd: expandDecimals(1, 30) },
          { orderType: OrderType.LimitDecrease, sizeDeltaUsd: expandDecimals(1, 30) },
          { orderType: OrderType.StopLossDecrease, sizeDeltaUsd: expandDecimals(1, 30) },
        ])
      )
    ).toBe(false);
  });
});
