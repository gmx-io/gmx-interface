import { describe, expect, it } from "vitest";

import type { OrderStatus, PendingOrderData } from "context/SyntheticsEvents/types";
import { getPositionKey } from "domain/synthetics/positions";
import { getOrderCreatedDataFromPendingOrder } from "domain/synthetics/tradeHistory/orderStatusesBackfill";
import { StatusCode } from "sdk/utils/gelatoRelay";
import { DecreasePositionSwapType, OrderType, type OrderInfo } from "sdk/utils/orders/types";

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
  it("does not match an existing identical order", () => {
    expect(
      resolve({ ordersInfoData: { old: order("old") }, orderStatuses: { old: status("old") } }).pendingOrders
    ).toHaveLength(2);
  });

  it.each(["wallet", "relay"])("ignores older orders loaded after a %s submission", (mode) => {
    const pending = { ...tp, createdAt: 1_700_000_100_999 };
    const batches = [
      {
        ...batch,
        orders: [pending],
        existingOrderKeys: [],
        transactionHash: mode === "wallet" ? "new-tx" : undefined,
      },
    ];
    expect(resolve({ batches, ordersInfoData: undefined }).pendingOrders).toHaveLength(1);

    const oldOrder = { ...order("old", pending), updatedAtTime: 1_700_000_099n };
    const result = resolve({ batches, ordersInfoData: { old: oldOrder } });
    expect(result.pendingOrders).toHaveLength(1);
    expect(result.completedBatchIds).toEqual([]);
    expect(result.batchUpdates).toEqual({});

    const confirmed = resolve({ batches, ordersInfoData: { old: oldOrder, new: order("new", pending) } });
    expect(confirmed.pendingOrders).toEqual([]);
    expect(confirmed.completedBatchIds).toEqual([batch.id]);
    expect(confirmed.completedOrderKeys).toEqual(["new"]);
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

  it("replaces each pending row only when its order appears", () => {
    const submitted = resolve({ ordersInfoData: undefined });
    expect(submitted.pendingOrders.map((entry) => entry.orderType)).toEqual([
      OrderType.LimitDecrease,
      OrderType.StopLossDecrease,
    ]);
    const orderStatuses = { tp: status("tp"), sl: status("sl", sl) };
    expect(resolve({ orderStatuses }).pendingOrders).toHaveLength(2);
    const partial = resolve({ orderStatuses, ordersInfoData: { tp: order("tp") } });
    expect(partial.pendingOrders.map((entry) => entry.id)).toEqual(["batch-1"]);
    expect(partial.completedBatchIds).toEqual([]);
    const complete = resolve({ orderStatuses, ordersInfoData: { tp: order("tp"), sl: order("sl", sl) } });
    expect(complete.pendingOrders).toEqual([]);
    expect(complete.completedBatchIds).toEqual([batch.id]);
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
    const differentPrice = { ...tp, triggerPrice: tp.triggerPrice + 1n };
    const differentSize = { ...tp, sizeDeltaUsd: tp.sizeDeltaUsd + 1n };
    const batches = [{ ...batch, orders: [tp, differentPrice, differentSize] }];
    const byPrice = resolve({ batches, ordersInfoData: { priced: order("priced", differentPrice) } });
    const bySize = resolve({ batches, ordersInfoData: { sized: order("sized", differentSize) } });
    expect(byPrice.pendingOrders.map((entry) => entry.id)).toEqual(["batch-0", "batch-2"]);
    expect(bySize.pendingOrders.map((entry) => entry.id)).toEqual(["batch-0", "batch-1"]);
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

  it("finishes an already executed order before its key was assigned to the pending batch", () => {
    const result = resolve({
      batches: [{ ...batch, orders: [tp] }],
      orderStatuses: { tp: status("tp", tp, { executedTxnHash: "settled" }) },
    });
    expect(result.completedBatchIds).toEqual([batch.id]);
  });

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
