import { isAddressEqual, parseEventLogs } from "viem";

import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import type { TransitOrder } from "sdk/utils/paxos/types";

function isTransitOrderPending(order: TransitOrder) {
  return order.status === "PENDING_BRIDGE" || order.status === "PROCESSING";
}

export function findPendingTransitOrder(
  orders: TransitOrder[],
  p: { offerAsset: string; wantAsset: string }
): TransitOrder | undefined {
  return orders.find(
    (order) =>
      isTransitOrderPending(order) &&
      isAddressEqual(order.offerAsset, p.offerAsset) &&
      isAddressEqual(order.wantAsset, p.wantAsset)
  );
}

export async function getSubmittedTransitOrderId(p: {
  chainId: number;
  txnHash: string;
  stationAddress: string;
}): Promise<string | undefined> {
  const receipt = await getPublicClientWithRpc(p.chainId).getTransactionReceipt({ hash: p.txnHash });
  const orderSubmittedLogs = parseEventLogs({
    abi: abis.TransitStation,
    eventName: "OrderSubmitted",
    logs: receipt.logs,
  });
  const orderSubmittedLog = orderSubmittedLogs.find((log) => isAddressEqual(log.address, p.stationAddress));

  return orderSubmittedLog?.args.uuid;
}
