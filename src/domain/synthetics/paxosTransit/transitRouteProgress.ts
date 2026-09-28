import type { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getGlvOrMarketAddress } from "domain/synthetics/markets/utils";
import type { ContractsChainId } from "sdk/configs/chains";

export type TransitRouteDirection = "usdcToUsdg" | "usdgToUsdc";

export type PaxosTransitConversion = {
  orderId: string;
  txnHash: string | undefined;
  offerAmount: bigint;
  isMocked: boolean;
};

export type TransitRouteProgress = {
  id: number;
  chainId: ContractsChainId;
  account: string;
  direction: TransitRouteDirection;
  glvOrMarketInfo: GlvOrMarketInfo;
  withdrawalTxnHash: string | undefined;
  conversion: PaxosTransitConversion | undefined;
};

export type NewTransitRouteProgress = Pick<
  TransitRouteProgress,
  "chainId" | "account" | "direction" | "glvOrMarketInfo" | "withdrawalTxnHash" | "conversion"
>;

export function getTransitRouteProgressForMarket(
  progress: TransitRouteProgress | undefined,
  p: { account: string | undefined; glvOrMarketAddress: string | undefined }
): TransitRouteProgress | undefined {
  if (!progress || p.glvOrMarketAddress === undefined) return undefined;

  if (progress.account !== p.account) return undefined;

  const progressMarketAddress = getGlvOrMarketAddress(progress.glvOrMarketInfo);

  if (progressMarketAddress !== p.glvOrMarketAddress) return undefined;

  return progress;
}
