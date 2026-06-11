import { describe, expect, it } from "vitest";

import { getPendingOrderKey, PendingOrderData } from "context/SyntheticsEvents";
import { OrderType } from "sdk/utils/orders/types";
import { PositionTradeAction, TradeActionType } from "sdk/utils/tradeHistory/types";

import {
  getBackfilledOrderStatusesByPendingKey,
  getMarketOrderExecutionBackfillParams,
} from "./OrderStatusNotification";

const account = "0x1111111111111111111111111111111111111111";
const marketAddress = "0x2222222222222222222222222222222222222222";
const collateralAddress = "0x3333333333333333333333333333333333333333";

function makePendingOrder(overrides: Partial<PendingOrderData> = {}): PendingOrderData {
  return {
    account,
    marketAddress,
    initialCollateralTokenAddress: collateralAddress,
    initialCollateralDeltaAmount: 10n,
    swapPath: [],
    sizeDeltaUsd: 100n,
    minOutputAmount: 0n,
    triggerPrice: 0n,
    acceptablePrice: 120n,
    autoCancel: false,
    isLong: true,
    orderType: OrderType.MarketIncrease,
    shouldUnwrapNativeToken: false,
    externalSwapQuote: undefined,
    txnType: "create",
    isTwap: false,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

function makeTradeAction(overrides: Partial<PositionTradeAction> = {}): PositionTradeAction {
  return {
    type: "position",
    id: "trade-action-id",
    eventName: TradeActionType.OrderExecuted,
    account,
    marketAddress,
    initialCollateralTokenAddress: collateralAddress,
    swapPath: [],
    initialCollateralDeltaAmount: 10n,
    sizeDeltaUsd: 100n,
    orderType: OrderType.MarketIncrease,
    orderKey: "0xorder",
    isLong: true,
    shouldUnwrapNativeToken: false,
    timestamp: 1_700_000_010,
    transactionHash: "0xexecution",
    ...overrides,
  } as PositionTradeAction;
}

describe("order status notification backfill", () => {
  it("builds trade history params for pending market creates", () => {
    const params = getMarketOrderExecutionBackfillParams([makePendingOrder()]);

    expect(params).toEqual({
      account,
      fromTxTimestamp: 1_699_999_940,
      orderEventCombinations: [
        {
          eventName: TradeActionType.OrderExecuted,
          orderType: [OrderType.MarketIncrease],
        },
      ],
    });
  });

  it("creates a completed order status from a matching executed trade action", () => {
    const pendingOrder = makePendingOrder();
    const statuses = getBackfilledOrderStatusesByPendingKey([pendingOrder], [makeTradeAction()]);
    const status = statuses.get(getPendingOrderKey(pendingOrder));

    expect(status?.key).toBe("0xorder");
    expect(status?.executedTxnHash).toBe("0xexecution");
    expect(status?.data?.key).toBe("0xorder");
    expect(status?.data && getPendingOrderKey(status.data)).toBe(getPendingOrderKey(pendingOrder));
  });

  it("does not complete a pending order from a different size", () => {
    const pendingOrder = makePendingOrder();
    const statuses = getBackfilledOrderStatusesByPendingKey(
      [pendingOrder],
      [makeTradeAction({ sizeDeltaUsd: pendingOrder.sizeDeltaUsd + 1n })]
    );

    expect(statuses.size).toBe(0);
  });
});
