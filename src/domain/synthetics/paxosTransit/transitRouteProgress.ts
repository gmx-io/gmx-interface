import type { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import type { ContractsChainId } from "sdk/configs/chains";
import type { TransitOrder } from "sdk/utils/paxos/types";

export type TransitRouteDirection = "buy" | "sell";

export type PaxosTransitConversion = {
  orderId: string;
  txnHash: string | undefined;
  offerAmount: bigint;
  isMocked: boolean;
};

export type TransitRouteProgress = {
  id: number;
  chainId: ContractsChainId;
  direction: TransitRouteDirection;
  marketInfo: GlvOrMarketInfo;
  withdrawalTxnHash: string | undefined;
  conversion: PaxosTransitConversion | undefined;
};

export type NewTransitRouteProgress = Pick<
  TransitRouteProgress,
  "chainId" | "direction" | "marketInfo" | "withdrawalTxnHash" | "conversion"
>;

export function getIsTransitOrderFinal(order: TransitOrder | undefined) {
  return order?.status === "PROCESSED" || order?.status === "REMOVED";
}
