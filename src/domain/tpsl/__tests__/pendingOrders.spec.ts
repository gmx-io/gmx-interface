import { describe, expect, it } from "vitest";

import type { OrderStatus, PendingOrderData } from "context/SyntheticsEvents/types";
import { getPositionKey } from "domain/synthetics/positions";
import {
  applyOrderBackfillMatches,
  getOrderBackfillMatches,
  getOrderBackfillParams,
  getOrderCreatedDataFromPendingOrder,
} from "domain/synthetics/tradeHistory/orderStatusesBackfill";
import type { TradeAction as RawTradeAction } from "sdk/codegen/subsquid";
import { StatusCode } from "sdk/utils/gelatoRelay";
import { DecreasePositionSwapType, OrderType, type OrderInfo } from "sdk/utils/orders/types";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

import { getPendingTpSlOrders } from "../pendingOrders";
import type { PendingTpSlOrderBatch } from "../types";

const tp: PendingOrderData = {
  account: "0xAccount",
  marketAddress: "0xMarket",
  initialCollateralTokenAddress: "0xCollateral",
  initialCollateralDeltaAmount: 0n,
  swapPath: [],
  sizeDeltaUsd: 1000n,
  minOutputAmount: 0n,
  triggerPrice: 2500n,
  acceptablePrice: 0n,
  autoCancel: false,
  isLong: true,
  orderType: OrderType.LimitDecrease,
  decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
  shouldUnwrapNativeToken: false,
  externalSwapQuote: undefined,
  txnType: "create",
  isTwap: false,
  createdAt: 1000,
};
const sl = { ...tp, orderType: OrderType.StopLossDecrease, triggerPrice: 1500n };
const batch: PendingTpSlOrderBatch = {
  id: "batch",
  chainId: 42161,
  orders: [tp, sl],
  existingOrderKeys: ["old"],
  relayTaskId: "task",
};
const positionKey = getPositionKey(tp.account, tp.marketAddress, tp.initialCollateralTokenAddress, tp.isLong);

function status(key: string, pending = tp, overrides: Partial<OrderStatus> = {}): OrderStatus {
  return {
    key,
    data: getOrderCreatedDataFromPendingOrder(pending, key),
    createdAt: 2000,
    createdTxnHash: "tx",
    ...overrides,
  };
}

function order(key: string, pending = tp): OrderInfo {
  return {
    ...getOrderCreatedDataFromPendingOrder(pending, key),
    updatedAtTime: BigInt(Math.floor(pending.createdAt / 1000)),
  } as unknown as OrderInfo;
}

function resolve(overrides: Partial<Parameters<typeof getPendingTpSlOrders>[0]> = {}) {
  return getPendingTpSlOrders({
    batches: [batch],
    chainId: batch.chainId,
    positionKey,
    ordersInfoData: {},
    orderStatuses: {},
    relayTaskStatuses: {},
    ...overrides,
  });
}

describe("pending TP/SL orders", () => {
  it.each([TradeActionType.OrderExecuted, TradeActionType.OrderCancelled] as const)(
    "recovers %s after creation backfill when the order never appears in the list",
    (eventName) => {
      const createdStatuses = applyOrderBackfillMatches({}, [
        { pendingOrder: tp, orderKey: "tp", eventName: TradeActionType.OrderCreated, transactionHash: "tx" },
      ]);
      const created = resolve({ batches: [{ ...batch, orders: [tp] }], orderStatuses: createdStatuses });
      const orders = created.batchUpdates[batch.id];
      expect(created.pendingOrders).toHaveLength(1);
      expect(getOrderBackfillParams(orders)).toMatchObject({
        orderKeys: ["tp"],
        orderEventCombinations: [
          { eventName: TradeActionType.OrderExecuted, orderType: [OrderType.LimitDecrease] },
          { eventName: TradeActionType.OrderCancelled, orderType: [OrderType.LimitDecrease] },
        ],
      });
      // Executed sizes can differ from the original request after a position decrease.
      const action = {
        id: "terminal",
        eventName,
        orderKey: "tp",
        transactionHash: "settled",
        sizeDeltaUsd: "500",
      } as RawTradeAction;
      const matches = getOrderBackfillMatches(orders, [action], createdStatuses);
      expect(matches).toHaveLength(1);
      expect(getOrderBackfillMatches(orders, [{ ...action, orderKey: "other" }], createdStatuses)).toEqual([]);
      const result = resolve({
        batches: [{ ...batch, orders }],
        orderStatuses: applyOrderBackfillMatches(createdStatuses, matches),
      });
      expect(result.pendingOrders).toEqual([]);
      expect(result.completedBatchIds).toEqual([batch.id]);
    }
  );

  it("shows each submitted order before order data is available", () => {
    const result = resolve({ ordersInfoData: undefined });
    expect(result.pendingOrders.map((entry) => entry.orderType)).toEqual([
      OrderType.LimitDecrease,
      OrderType.StopLossDecrease,
    ]);
    expect(result.pendingOrders.map((entry) => entry.id)).toEqual(["batch-0", "batch-1"]);
    expect(result.completedBatchIds).toEqual([]);
  });

  it("does not match an existing identical order", () => {
    expect(
      resolve({ ordersInfoData: { old: order("old") }, orderStatuses: { old: status("old") } }).pendingOrders
    ).toHaveLength(2);
  });

  it.each(["wallet", "relay"])("ignores older orders loaded after a %s submission", (mode) => {
    const pending = { ...tp, createdAt: 1_700_000_100_500 };
    const batches = [
      {
        ...batch,
        orders: [pending],
        existingOrderKeys: [],
        transactionHash: mode === "wallet" ? "new-tx" : undefined,
      },
    ];
    expect(resolve({ batches, ordersInfoData: undefined }).pendingOrders).toHaveLength(1);

    const oldOrder = { ...order("old", pending), updatedAtTime: 1_700_000_000n };
    const result = resolve({ batches, ordersInfoData: { old: oldOrder } });
    expect(result.pendingOrders).toHaveLength(1);
    expect(result.completedBatchIds).toEqual([]);
    expect(result.batchUpdates).toEqual({});

    const confirmed = resolve({ batches, ordersInfoData: { old: oldOrder, new: order("new", pending) } });
    expect(confirmed.pendingOrders).toEqual([]);
    expect(confirmed.completedBatchIds).toEqual([batch.id]);
    expect(confirmed.completedOrderKeys).toEqual(["new"]);
  });

  it("uses second precision for fetched orders created during submission", () => {
    const pending = { ...tp, createdAt: 1_700_000_100_999 };
    const batches = [{ ...batch, orders: [pending], existingOrderKeys: [], transactionHash: "tx" }];

    expect(
      resolve({
        batches,
        ordersInfoData: { old: { ...order("old", pending), updatedAtTime: 1_700_000_099n } },
      }).pendingOrders
    ).toHaveLength(1);
    expect(resolve({ batches, ordersInfoData: { new: order("new", pending) } }).completedBatchIds).toEqual([batch.id]);
  });

  it("trusts matching creation transaction identity when the local clock is ahead", () => {
    const pending = { ...tp, createdAt: 1_700_000_100_000 };
    const result = resolve({
      batches: [{ ...batch, orders: [pending], transactionHash: "tx" }],
      ordersInfoData: { tp: { ...order("tp", pending), updatedAtTime: 1_700_000_000n } },
      orderStatuses: { tp: status("tp", pending) },
    });
    expect(result.pendingOrders).toEqual([]);
    expect(result.completedBatchIds).toEqual([batch.id]);
  });

  it("keeps rows pending between creation events and fetched order data", () => {
    expect(resolve({ orderStatuses: { tp: status("tp"), sl: status("sl", sl) } }).pendingOrders).toHaveLength(2);
  });

  it("replaces each pending row only when its order appears", () => {
    const orderStatuses = { tp: status("tp"), sl: status("sl", sl) };
    const partial = resolve({ orderStatuses, ordersInfoData: { tp: order("tp") } });
    expect(partial.pendingOrders.map((entry) => entry.id)).toEqual(["batch-1"]);
    expect(partial.completedBatchIds).toEqual([]);
    const complete = resolve({ orderStatuses, ordersInfoData: { tp: order("tp"), sl: order("sl", sl) } });
    expect(complete.pendingOrders).toEqual([]);
    expect(complete.completedBatchIds).toEqual([batch.id]);
  });

  it("can confirm from fetched orders when websocket events are missing", () => {
    expect(resolve({ ordersInfoData: { tp: order("tp"), sl: order("sl", sl) } }).completedBatchIds).toEqual([batch.id]);
  });

  it("does not restore a confirmed entry when a later refresh omits it", () => {
    const partial = resolve({ ordersInfoData: { tp: order("tp") } });
    const result = resolve({ batches: [{ ...batch, orders: partial.batchUpdates[batch.id] }] });
    expect(result.pendingOrders.map((entry) => entry.id)).toEqual(["batch-1"]);
    expect(result.batchUpdates).toEqual({});
  });

  it("retains an assigned order key across creation, execution and data refreshes", () => {
    const created = resolve({ orderStatuses: { tp: status("tp") } });
    const result = resolve({
      batches: [{ ...batch, orders: created.batchUpdates[batch.id] }],
      orderStatuses: { tp: { key: "tp", createdAt: 2000, executedTxnHash: "executed" } },
    });
    expect(result.pendingOrders.map((entry) => entry.id)).toEqual(["batch-1"]);
  });

  it("allocates identical submitted orders to distinct confirmed keys", () => {
    const batches = [{ ...batch, orders: [tp, tp] }];
    const partial = resolve({
      batches,
      ordersInfoData: { first: order("first") },
      orderStatuses: { first: status("first") },
    });
    expect(partial.pendingOrders.map((entry) => entry.id)).toEqual(["batch-1"]);
    expect(
      resolve({ batches, ordersInfoData: { first: order("first"), second: order("second") } }).completedBatchIds
    ).toEqual([batch.id]);
  });

  it("does not use the same order to confirm separate batches", () => {
    const batches = [
      { ...batch, orders: [tp] },
      { ...batch, id: "second-batch", orders: [tp] },
    ];
    const result = resolve({ batches, ordersInfoData: { first: order("first") } });
    expect(result.pendingOrders.map((entry) => entry.id)).toEqual(["second-batch-0"]);
  });

  it("matches prices and sizes within a batch", () => {
    const otherTp = { ...tp, triggerPrice: tp.triggerPrice + 1n, sizeDeltaUsd: tp.sizeDeltaUsd + 1n };
    const result = resolve({
      batches: [{ ...batch, orders: [tp, otherTp] }],
      ordersInfoData: { other: order("other", otherTp) },
    });
    expect(result.pendingOrders.map((entry) => entry.id)).toEqual(["batch-0"]);
  });

  it("ignores events from a different creation transaction", () => {
    const result = resolve({
      batches: [{ ...batch, transactionHash: "new-tx" }],
      orderStatuses: { tp: status("tp", tp, { cancelledTxnHash: "cancel" }) },
    });
    expect(result.pendingOrders).toHaveLength(2);
  });

  it.each(["wallet", "relay"])("ignores fetched orders from another %s creation transaction", (mode) => {
    const result = resolve({
      batches: [{ ...batch, transactionHash: mode === "wallet" ? "new-tx" : undefined }],
      relayTaskStatuses: { task: { taskId: "task", statusCode: StatusCode.Success, transactionHash: "new-tx" } },
      ordersInfoData: { tp: order("tp") },
      orderStatuses: { tp: status("tp") },
    });
    expect(result.pendingOrders).toHaveLength(2);
    expect(result.completedBatchIds).toEqual([]);
    expect(result.batchUpdates).toEqual({});
  });

  it("allocates identical orders to the batch with the matching creation transaction", () => {
    const result = resolve({
      batches: [
        { ...batch, orders: [tp], transactionHash: "first-tx" },
        { ...batch, id: "second-batch", orders: [tp], transactionHash: "tx" },
      ],
      ordersInfoData: { tp: order("tp") },
      orderStatuses: { tp: status("tp") },
    });
    expect(result.completedBatchIds).toEqual(["second-batch"]);
    expect(result.pendingOrders.map((entry) => entry.id)).toEqual(["batch-0"]);
  });

  it("releases an incorrectly assigned key when the relay reports its creation transaction", () => {
    const result = resolve({
      batches: [
        { ...batch, orders: [{ ...tp, orderKey: "tp", isConfirmed: true }, sl] },
        { ...batch, id: "second-batch", orders: [tp], transactionHash: "tx" },
      ],
      relayTaskStatuses: { task: { taskId: "task", statusCode: StatusCode.Success, transactionHash: "other-tx" } },
      ordersInfoData: { tp: order("tp") },
      orderStatuses: { tp: status("tp") },
    });
    expect(result.completedBatchIds).toEqual(["second-batch"]);
    expect(result.pendingOrders.map((entry) => entry.id)).toEqual(["batch-0", "batch-1"]);
    expect(result.batchUpdates[batch.id][0]).toMatchObject({ orderKey: undefined, isConfirmed: false });
  });

  it("keeps fetched-order recovery when creation metadata is unavailable", () => {
    const result = resolve({
      batches: [{ ...batch, orders: [tp], transactionHash: "tx" }],
      ordersInfoData: { tp: order("tp") },
    });
    expect(result.completedBatchIds).toEqual([batch.id]);
  });

  it("does not settle a batch while its wallet submission is still awaiting a signature", () => {
    const result = resolve({
      batches: [{ ...batch, relayTaskId: undefined }],
      ordersInfoData: { tp: order("tp"), sl: order("sl", sl) },
      orderStatuses: { tp: status("tp"), sl: status("sl", sl) },
    });
    expect(result.pendingOrders).toHaveLength(2);
    expect(result.completedBatchIds).toEqual([]);
    expect(result.batchUpdates).toEqual({});
  });

  it.each([StatusCode.Rejected, StatusCode.Reverted])("removes a batch after relay failure %s", (statusCode) => {
    const result = resolve({
      batches: [{ ...batch, relayTaskId: "task" }],
      relayTaskStatuses: { task: { taskId: "task", statusCode, message: "failed" } },
    });
    expect(result.pendingOrders).toEqual([]);
    expect(result.completedBatchIds).toEqual([batch.id]);
  });

  it("keeps a confirmed creation pending through a contradictory relay failure until data arrives", () => {
    const result = resolve({
      batches: [{ ...batch, relayTaskId: "task" }],
      orderStatuses: { tp: status("tp") },
      relayTaskStatuses: { task: { taskId: "task", statusCode: StatusCode.Rejected, message: "timed out" } },
    });
    expect(result.pendingOrders).toHaveLength(2);
    expect(result.completedBatchIds).toEqual([]);
  });

  it.each(["executedTxnHash", "cancelledTxnHash"] as const)(
    "finishes orders that %s before appearing in the list",
    (field) => {
      const result = resolve({
        batches: [{ ...batch, orders: [tp] }],
        orderStatuses: { tp: status("tp", tp, { [field]: "settled" }) },
      });
      expect(result.completedBatchIds).toEqual([batch.id]);
    }
  );

  it("scopes pending entries to the chain, account, market, collateral and direction", () => {
    expect(resolve({ chainId: 43114 }).pendingOrders).toEqual([]);
    expect(resolve({ positionKey: undefined }).pendingOrders).toEqual([]);
    for (const other of [
      { account: "0xOther" },
      { marketAddress: "0xOther" },
      { initialCollateralTokenAddress: "0xOther" },
      { isLong: false },
    ]) {
      const value = { ...tp, ...other };
      expect(
        resolve({
          positionKey: getPositionKey(
            value.account,
            value.marketAddress,
            value.initialCollateralTokenAddress,
            value.isLong
          ),
        }).pendingOrders
      ).toEqual([]);
    }
  });
});
