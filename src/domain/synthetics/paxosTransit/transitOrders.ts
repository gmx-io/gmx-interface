import { decodeFunctionData, type Hex, isAddressEqual, parseEventLogs } from "viem";

import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import type { TransitOrder, TransitQuote } from "sdk/utils/paxos/types";

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

export function getTransitQuoteDeadline(quote: TransitQuote | undefined): number | undefined {
  if (!quote?.transaction.data) {
    return undefined;
  }

  try {
    const { functionName, args } = decodeFunctionData({ abi: abis.TransitStation, data: quote.transaction.data as Hex });

    if (functionName !== "submitOrder" && functionName !== "submitOrderWithPermit") {
      return undefined;
    }

    return Number(args[0].deadline);
  } catch {
    return undefined;
  }
}
