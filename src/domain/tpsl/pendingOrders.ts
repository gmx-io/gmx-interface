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
      .flatMap((batch) => {
        const transactionHash =
          batch.transactionHash ??
          (batch.relayTaskId ? relayTaskStatuses[batch.relayTaskId]?.transactionHash : undefined);

        return batch.orders.flatMap((order) =>
          order.orderKey &&
          !hasConflictingCreationTransaction(transactionHash, orderStatuses[order.orderKey]?.createdTxnHash)
            ? [order.orderKey]
            : []
        );
      })
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
      if (!batch.transactionHash && !batch.relayTaskId) {
        batchPendingOrders.push({ ...pendingOrder, id: `${batch.id}-${index}` });
        return pendingOrder;
      }

      const hasConflictingOrderKey =
        pendingOrder.orderKey !== undefined &&
        hasConflictingCreationTransaction(transactionHash, orderStatuses[pendingOrder.orderKey]?.createdTxnHash);
      const assignedOrderKey = hasConflictingOrderKey ? undefined : pendingOrder.orderKey;
      const status = assignedOrderKey
        ? orderStatuses[assignedOrderKey]
        : statuses.find(
            (status) =>
              !existingOrderKeys.has(status.key) &&
              !usedOrderKeys.has(status.key) &&
              (!transactionHash || status.createdTxnHash === transactionHash) &&
              status.data &&
              isMatchingOrder(pendingOrder, status.data)
          );
      const knownOrderKey = assignedOrderKey ?? status?.key;
      const order = knownOrderKey
        ? ordersInfoData?.[knownOrderKey]
        : orders.find(
            (order) =>
              !existingOrderKeys.has(order.key) &&
              !usedOrderKeys.has(order.key) &&
              !hasConflictingCreationTransaction(transactionHash, orderStatuses[order.key]?.createdTxnHash) &&
              order.updatedAtTime >= BigInt(Math.floor(pendingOrder.createdAt / 1000)) &&
              isMatchingOrder(pendingOrder, order)
          );

      const orderKey = knownOrderKey ?? order?.key;
      if (orderKey) {
        usedOrderKeys.add(orderKey);
        batchOrderKeys.push(orderKey);
      }

      const isConfirmed = Boolean(
        (!hasConflictingOrderKey && pendingOrder.isConfirmed) ||
          order ||
          status?.executedTxnHash ||
          status?.cancelledTxnHash
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

function hasConflictingCreationTransaction(transactionHash: string | undefined, createdTxnHash: string | undefined) {
  return Boolean(transactionHash && createdTxnHash && transactionHash !== createdTxnHash);
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
