import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { PendingOrderData, OrderStatuses } from "context/SyntheticsEvents/types";
import { getPendingOrderKey } from "context/SyntheticsEvents/utils";
import { TradeAction as RawTradeAction } from "sdk/codegen/subsquid";
import { OrderType } from "sdk/utils/orders/types";
import { ExternalSwapQuote } from "sdk/utils/trade/types";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

import {
  getOrderBackfillParams,
  getOrderBackfillMatches,
  getOrderCreatedDataFromPendingOrder,
} from "./orderStatusesBackfill";

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

function makeRawAction(overrides: Partial<RawTradeAction> = {}): RawTradeAction {
  return {
    id: "raw-action-id",
    eventName: TradeActionType.OrderExecuted,
    account,
    marketAddress,
    initialCollateralTokenAddress: collateralAddress,
    initialCollateralDeltaAmount: "10",
    sizeDeltaUsd: "100",
    minOutputAmount: "0",
    triggerPrice: "0",
    swapPath: [],
    orderType: OrderType.MarketIncrease,
    orderKey: "0xorder",
    isLong: true,
    shouldUnwrapNativeToken: false,
    timestamp: 1_700_000_010,
    transactionHash: "0xexecution",
    uiFeeReceiver: zeroAddress,
    ...overrides,
  };
}

describe("getOrderBackfillParams", () => {
  it("returns undefined when nothing needs recovery", () => {
    expect(getOrderBackfillParams([])).toBeUndefined();
    expect(
      getOrderBackfillParams([makePendingOrder({ isTwap: true, orderType: OrderType.LimitIncrease })])
    ).toBeUndefined();
    expect(getOrderBackfillParams([makePendingOrder({ txnType: "cancel", orderKey: undefined })])).toBeUndefined();
  });

  it("queries executed and cancelled actions for market creates with a lookback window", () => {
    expect(getOrderBackfillParams([makePendingOrder()])).toEqual({
      account,
      fromTxTimestamp: 1_699_999_940,
      orderEventCombinations: [
        { eventName: TradeActionType.OrderExecuted, orderType: [OrderType.MarketIncrease] },
        { eventName: TradeActionType.OrderCancelled, orderType: [OrderType.MarketIncrease] },
      ],
    });
  });

  it("queries deposit and withdrawal actions for zero-size market orders", () => {
    const params = getOrderBackfillParams([
      makePendingOrder(),
      makePendingOrder({ sizeDeltaUsd: 0n, orderType: OrderType.MarketDecrease }),
    ]);

    expect(params?.orderEventCombinations).toEqual([
      { eventName: TradeActionType.OrderExecuted, orderType: [OrderType.MarketIncrease] },
      { eventName: TradeActionType.OrderCancelled, orderType: [OrderType.MarketIncrease] },
      { eventName: TradeActionType.OrderExecuted, orderType: [OrderType.MarketDecrease], isDepositOrWithdraw: true },
      { eventName: TradeActionType.OrderCancelled, orderType: [OrderType.MarketDecrease], isDepositOrWithdraw: true },
    ]);
  });

  it("queries created actions for limit and trigger creates", () => {
    const params = getOrderBackfillParams([makePendingOrder({ orderType: OrderType.LimitDecrease })]);

    expect(params?.orderEventCombinations).toEqual([
      { eventName: TradeActionType.OrderCreated, orderType: [OrderType.LimitDecrease] },
    ]);
  });

  it("queries updated and cancelled actions for update and cancel transactions", () => {
    const params = getOrderBackfillParams([
      makePendingOrder({ txnType: "update", orderKey: "0xorder", orderType: OrderType.LimitDecrease }),
      makePendingOrder({ txnType: "cancel", orderKey: "0xanother", orderType: OrderType.LimitIncrease }),
    ]);

    expect(params?.orderEventCombinations).toEqual([
      { eventName: TradeActionType.OrderUpdated, orderType: [OrderType.LimitDecrease] },
      { eventName: TradeActionType.OrderCancelled, orderType: [OrderType.LimitIncrease] },
    ]);
  });
});

describe("getOrderBackfillMatches", () => {
  function getMatches(
    pendingOrders: PendingOrderData[],
    rawActions: RawTradeAction[] | undefined,
    orderStatuses: OrderStatuses = {}
  ) {
    return getOrderBackfillMatches(pendingOrders, rawActions, orderStatuses);
  }

  it("matches an executed action to a pending market create", () => {
    const pendingOrder = makePendingOrder();
    const matches = getMatches([pendingOrder], [makeRawAction()]);

    expect(matches).toEqual([
      {
        pendingOrder,
        orderKey: "0xorder",
        eventName: TradeActionType.OrderExecuted,
        transactionHash: "0xexecution",
      },
    ]);
  });

  it("matches a cancelled action to a pending market create", () => {
    const matches = getMatches([makePendingOrder()], [makeRawAction({ eventName: TradeActionType.OrderCancelled })]);

    expect(matches[0]?.eventName).toBe(TradeActionType.OrderCancelled);
  });

  it("matches a created action to a pending limit create by fields and trigger price", () => {
    const pendingOrder = makePendingOrder({ orderType: OrderType.LimitDecrease, triggerPrice: 1500n });
    const createdAction = makeRawAction({
      eventName: TradeActionType.OrderCreated,
      orderType: OrderType.LimitDecrease,
      triggerPrice: "1500",
    });

    expect(getMatches([pendingOrder], [createdAction])[0]?.eventName).toBe(TradeActionType.OrderCreated);
    expect(getMatches([pendingOrder], [{ ...createdAction, triggerPrice: "1501" }])).toEqual([]);
  });

  it("does not match executed or cancelled actions to a pending limit create", () => {
    const pendingOrder = makePendingOrder({ orderType: OrderType.LimitDecrease });
    const action = makeRawAction({ orderType: OrderType.LimitDecrease });

    expect(getMatches([pendingOrder], [action])).toEqual([]);
  });

  it("matches an update transaction exactly by order key", () => {
    const pendingOrder = makePendingOrder({
      txnType: "update",
      orderKey: "0xorder",
      orderType: OrderType.LimitDecrease,
    });
    const updatedAction = makeRawAction({
      eventName: TradeActionType.OrderUpdated,
      orderType: OrderType.LimitDecrease,
      transactionHash: "0xupdate",
    });

    expect(getMatches([pendingOrder], [updatedAction])).toEqual([
      {
        pendingOrder,
        orderKey: "0xorder",
        eventName: TradeActionType.OrderUpdated,
        transactionHash: "0xupdate",
      },
    ]);
    expect(getMatches([pendingOrder], [{ ...updatedAction, orderKey: "0xanother" }])).toEqual([]);
  });

  it("matches a cancel transaction exactly by order key", () => {
    const pendingOrder = makePendingOrder({
      txnType: "cancel",
      orderKey: "0xorder",
      orderType: OrderType.LimitDecrease,
    });
    const cancelledAction = makeRawAction({
      eventName: TradeActionType.OrderCancelled,
      orderType: OrderType.LimitDecrease,
      transactionHash: "0xcancel",
    });

    expect(getMatches([pendingOrder], [cancelledAction])[0]?.eventName).toBe(TradeActionType.OrderCancelled);
    expect(getMatches([pendingOrder], [{ ...cancelledAction, orderKey: "0xanother" }])).toEqual([]);
  });

  it("does not match an action executed before the order was submitted", () => {
    const matches = getMatches([makePendingOrder()], [makeRawAction({ timestamp: 1_699_999_900 })]);

    expect(matches).toEqual([]);
  });

  it("does not match an action with a different size", () => {
    const matches = getMatches([makePendingOrder()], [makeRawAction({ sizeDeltaUsd: "101" })]);

    expect(matches).toEqual([]);
  });

  it("does not match an action with a different collateral amount", () => {
    const matches = getMatches([makePendingOrder()], [makeRawAction({ initialCollateralDeltaAmount: "11" })]);

    expect(matches).toEqual([]);
  });

  it("ignores the collateral amount for orders with an external swap", () => {
    const pendingOrder = makePendingOrder({ externalSwapQuote: { amountIn: 11n } as ExternalSwapQuote });
    const matches = getMatches([pendingOrder], [makeRawAction({ initialCollateralDeltaAmount: "11" })]);

    expect(matches).toHaveLength(1);
  });

  it("does not match a swap action with a different min output amount", () => {
    const pendingSwap = makePendingOrder({
      orderType: OrderType.MarketSwap,
      marketAddress: zeroAddress,
      sizeDeltaUsd: 0n,
      isLong: false,
      minOutputAmount: 5000n,
    });
    const swapAction = makeRawAction({
      orderType: OrderType.MarketSwap,
      marketAddress: null,
      sizeDeltaUsd: null,
      isLong: null,
      minOutputAmount: "100",
    });

    expect(getMatches([pendingSwap], [swapAction])).toEqual([]);
    expect(getMatches([pendingSwap], [{ ...swapAction, minOutputAmount: "5000" }])).toHaveLength(1);
  });

  it("consumes each action at most once", () => {
    const matches = getMatches([makePendingOrder(), makePendingOrder()], [makeRawAction()]);

    expect(matches).toHaveLength(1);
  });

  it("skips actions already applied to the order status", () => {
    const executedStatuses: OrderStatuses = {
      "0xorder": { key: "0xorder", createdAt: 1_700_000_000_000, executedTxnHash: "0xseen" },
    };

    expect(getMatches([makePendingOrder()], [makeRawAction()], executedStatuses)).toEqual([]);

    const createdStatuses: OrderStatuses = {
      "0xorder": { key: "0xorder", createdAt: 1_700_000_000_000, createdTxnHash: "0xseen" },
    };
    const pendingLimit = makePendingOrder({ orderType: OrderType.LimitDecrease });
    const createdAction = makeRawAction({
      eventName: TradeActionType.OrderCreated,
      orderType: OrderType.LimitDecrease,
    });

    expect(getMatches([pendingLimit], [createdAction], createdStatuses)).toEqual([]);
  });

  it("still matches an execution when only the creation was seen", () => {
    const createdOnlyStatuses: OrderStatuses = {
      "0xorder": { key: "0xorder", createdAt: 1_700_000_000_000, createdTxnHash: "0xcreate" },
    };

    expect(getMatches([makePendingOrder()], [makeRawAction()], createdOnlyStatuses)).toHaveLength(1);
  });
});

describe("getOrderCreatedDataFromPendingOrder", () => {
  it("produces data with the same pending order key", () => {
    const pendingOrder = makePendingOrder();
    const data = getOrderCreatedDataFromPendingOrder(pendingOrder, "0xorder");

    expect(data.key).toBe("0xorder");
    expect(getPendingOrderKey(data)).toBe(getPendingOrderKey(pendingOrder));
  });
});
