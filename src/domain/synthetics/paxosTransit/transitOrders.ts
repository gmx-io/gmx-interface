import { isAddressEqual, parseEventLogs } from "viem";

import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import type { TransitOrder } from "sdk/utils/paxos/types";

function getIsTransitOrderPending(order: TransitOrder) {
  return order.status === "PENDING_BRIDGE" || order.status === "PROCESSING";
}

export function getIsTransitOrderFinal(order: TransitOrder | undefined) {
  return order?.status === "PROCESSED" || order?.status === "REMOVED";
}

export function findPendingTransitOrder(
  orders: TransitOrder[],
  p: { offerAsset: string; wantAsset: string }
): TransitOrder | undefined {
  return orders.find(
    (order) =>
      getIsTransitOrderPending(order) &&
      isAddressEqual(order.offerAsset, p.offerAsset) &&
      isAddressEqual(order.wantAsset, p.wantAsset)
  );
}

export const TRANSIT_RECENT_ORDERS_PAGE_SIZE = 10;

const SUBMITTED_ORDER_CLOCK_SKEW_MS = 10 * 60_000;

export function findSubmittedTransitOrder(
  orders: TransitOrder[],
  p: { offerAsset: string; wantAsset: string; offerAmount: bigint; submittedAt: number; knownOrderIds?: string[] }
): TransitOrder | undefined {
  return orders.find(
    (order) =>
      isAddressEqual(order.offerAsset, p.offerAsset) &&
      isAddressEqual(order.wantAsset, p.wantAsset) &&
      order.offerAmount === p.offerAmount &&
      (p.knownOrderIds
        ? !p.knownOrderIds.includes(order.id)
        : Date.parse(order.createdAt) >= p.submittedAt - SUBMITTED_ORDER_CLOCK_SKEW_MS)
  );
}

export async function getSubmittedTransitOrderId(p: {
  chainId: number;
  txnHash: string;
  stationAddress: string;
}): Promise<string | undefined> {
  const receipt = await getPublicClientWithRpc(p.chainId).waitForTransactionReceipt({ hash: p.txnHash });
  const orderSubmittedLogs = parseEventLogs({
    abi: abis.TransitStation,
    eventName: "OrderSubmitted",
    logs: receipt.logs,
  });
  const orderSubmittedLog = orderSubmittedLogs.find((log) => isAddressEqual(log.address, p.stationAddress));

  return orderSubmittedLog?.args.uuid;
}
