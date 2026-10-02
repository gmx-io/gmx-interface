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
  glvOrMarketAddress: string;
  withdrawalTxnHash: string | undefined;
  conversion: PaxosTransitConversion | undefined;
  depositTxnHash: string | undefined;
  isContinueRequested: boolean;
};

export type NewTransitRouteProgress = Pick<
  TransitRouteProgress,
  "chainId" | "account" | "direction" | "glvOrMarketAddress" | "withdrawalTxnHash" | "conversion"
>;

export function getTransitRouteProgressForMarket(
  progress: TransitRouteProgress | undefined,
  p: { account: string | undefined; glvOrMarketAddress: string | undefined }
): TransitRouteProgress | undefined {
  if (!progress || p.glvOrMarketAddress === undefined) return undefined;

  if (progress.account !== p.account) return undefined;

  if (progress.glvOrMarketAddress !== p.glvOrMarketAddress) return undefined;

  return progress;
}
