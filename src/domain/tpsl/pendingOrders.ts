import type {
  OrderCreatedEventData,
  OrderStatuses,
  PendingOrderData,
  RelayTaskStatus,
} from "context/SyntheticsEvents/types";
import { getPendingOrderKey } from "context/SyntheticsEvents/utils";
import { getPositionKey } from "domain/synthetics/positions";
import { StatusCode } from "sdk/utils/gelatoRelay";
import type { OrderInfo, OrdersInfoData } from "sdk/utils/orders/types";

import type { PendingTpSlOrder, PendingTpSlOrderBatch } from "./types";

export function getPendingTpSlOrders({
  batches,
  chainId,
  positionKey,
  ordersInfoData,
  orderStatuses,
  relayTaskStatuses,
}: {
  batches: PendingTpSlOrderBatch[];
  chainId: number;
  positionKey: string | undefined;
  ordersInfoData: OrdersInfoData | undefined;
  orderStatuses: OrderStatuses;
  relayTaskStatuses: Record<string, RelayTaskStatus>;
}) {
  const pendingOrders: PendingTpSlOrder[] = [];
  const completedBatchIds: string[] = [];
  const completedOrderKeys: string[] = [];
  const batchUpdates: Record<string, PendingTpSlOrderBatch["orders"]> = {};
  const usedOrderKeys = new Set(
    batches
      .filter((batch) => batch.chainId === chainId)
      .flatMap((batch) => batch.orders.flatMap((order) => (order.orderKey ? [order.orderKey] : [])))
  );
  const orders = Object.values(ordersInfoData ?? {});
  const statuses = Object.values(orderStatuses);

  for (const batch of batches) {
    if (batch.chainId !== chainId) continue;

    const relayStatus = batch.relayTaskId ? relayTaskStatuses[batch.relayTaskId] : undefined;
    const transactionHash = batch.transactionHash ?? relayStatus?.transactionHash;
    const isFailed = relayStatus?.statusCode === StatusCode.Rejected || relayStatus?.statusCode === StatusCode.Reverted;
    const existingOrderKeys = new Set(batch.existingOrderKeys);
    const batchPendingOrders: PendingTpSlOrder[] = [];
    const batchOrderKeys: string[] = [];
    let hasSettledOrder = false;

    const updatedOrders = batch.orders.map((pendingOrder, index) => {
      const status = pendingOrder.orderKey
        ? orderStatuses[pendingOrder.orderKey]
        : statuses.find(
            (status) =>
              !existingOrderKeys.has(status.key) &&
              !usedOrderKeys.has(status.key) &&
              (!transactionHash || status.createdTxnHash === transactionHash) &&
              status.data &&
              isMatchingOrder(pendingOrder, status.data)
          );
      const knownOrderKey = pendingOrder.orderKey ?? status?.key;
      const order = knownOrderKey
        ? ordersInfoData?.[knownOrderKey]
        : orders.find(
            (order) =>
              !existingOrderKeys.has(order.key) && !usedOrderKeys.has(order.key) && isMatchingOrder(pendingOrder, order)
          );

      const orderKey = knownOrderKey ?? order?.key;
      if (orderKey) {
        usedOrderKeys.add(orderKey);
        batchOrderKeys.push(orderKey);
      }

      const isConfirmed = Boolean(
        pendingOrder.isConfirmed || order || status?.executedTxnHash || status?.cancelledTxnHash
      );
      hasSettledOrder = hasSettledOrder || isConfirmed || Boolean(status?.createdTxnHash);

      // A creation event can arrive before the order is available to the normal list.
      if (!isConfirmed) {
        batchPendingOrders.push({ ...pendingOrder, id: `${batch.id}-${index}` });
      }

      return orderKey !== pendingOrder.orderKey || isConfirmed !== Boolean(pendingOrder.isConfirmed)
        ? { ...pendingOrder, orderKey, isConfirmed }
        : pendingOrder;
    });

    if ((isFailed && !hasSettledOrder) || batchPendingOrders.length === 0) {
      completedBatchIds.push(batch.id);
      completedOrderKeys.push(...batchOrderKeys);
      continue;
    }

    if (updatedOrders.some((order, index) => order !== batch.orders[index])) {
      batchUpdates[batch.id] = updatedOrders;
    }

    pendingOrders.push(
      ...batchPendingOrders.filter(
        (order) =>
          getPositionKey(order.account, order.marketAddress, order.initialCollateralTokenAddress, order.isLong) ===
          positionKey
      )
    );
  }

  return { pendingOrders, completedBatchIds, completedOrderKeys, batchUpdates };
}

function isMatchingOrder(pending: PendingOrderData, order: OrderCreatedEventData | OrderInfo) {
  return (
    !order.isTwap &&
    getPendingOrderKey(pending) === getPendingOrderKey({ ...pending, ...order }) &&
    pending.triggerPrice === order.contractTriggerPrice &&
    pending.sizeDeltaUsd === order.sizeDeltaUsd &&
    pending.initialCollateralDeltaAmount === order.initialCollateralDeltaAmount
  );
}
