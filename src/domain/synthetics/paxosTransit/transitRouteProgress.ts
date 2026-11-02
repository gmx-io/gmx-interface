import { PAXOS_TRANSIT_ROUTE_PROGRESS_KEY } from "config/localStorage";
import { readLocalStorageItem, removeLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import { deserializeBigIntsInObject, serializeBigIntsInObject } from "lib/numbers";
import type { ContractsChainId } from "sdk/configs/chains";
import type { TransitOrder } from "sdk/utils/paxos/types";

export type TransitRouteDirection = "usdcToUsdg" | "usdgToUsdc";

export type PaxosTransitConversion = {
  orderId: string | undefined;
  txnHash: string | undefined;
  offerAmount: bigint;
  isMocked: boolean;
  submittedAt?: number;
  knownOrderIds?: string[];
};

const TRANSIT_ORDER_LOOKUP_TIMEOUT_MS = 20 * 60_000;

export type TransitRouteProgress = {
  id: number;
  chainId: ContractsChainId;
  account: string;
  direction: TransitRouteDirection;
  glvOrMarketAddress: string | undefined;
  withdrawalTxnHash: string | undefined;
  withdrawalExecutedTxnHash: string | undefined;
  conversion: PaxosTransitConversion | undefined;
  depositTxnHash: string | undefined;
  isContinueRequested: boolean;
  isDismissed: boolean;
  // set when the conversion tops up margin of a USDG position that was too large to convert instantly
  addMarginPositionKey?: string;
};

export type NewTransitRouteProgress = Pick<
  TransitRouteProgress,
  | "chainId"
  | "account"
  | "direction"
  | "glvOrMarketAddress"
  | "withdrawalTxnHash"
  | "conversion"
  | "addMarginPositionKey"
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

export function getIsTransitOrderLookupExpired(conversion: PaxosTransitConversion | undefined, now: number): boolean {
  return (
    conversion !== undefined &&
    conversion.orderId === undefined &&
    conversion.submittedAt !== undefined &&
    now - conversion.submittedAt > TRANSIT_ORDER_LOOKUP_TIMEOUT_MS
  );
}

export function getShouldStoreTransitRouteProgress(p: {
  progress: TransitRouteProgress;
  order: TransitOrder | undefined;
  isWithdrawalCancelled: boolean;
  isOrderLookupExpired: boolean;
}): boolean {
  const { progress, order, isWithdrawalCancelled, isOrderLookupExpired } = p;
  const isUsdcToUsdg = progress.direction === "usdcToUsdg";
  const isConverted = order?.status === "PROCESSED";
  const isConversionRemoved = order?.status === "REMOVED";
  const isDepositSent = progress.depositTxnHash !== undefined;
  const isWithdrawalExecuted =
    progress.withdrawalTxnHash === undefined || progress.withdrawalExecutedTxnHash !== undefined;

  if (isOrderLookupExpired) return false;

  // the continue step comes after the conversion, so it has to survive a reload
  if (progress.addMarginPositionKey !== undefined) return !progress.isDismissed && !isConversionRemoved;

  if (progress.glvOrMarketAddress === undefined) return !isConverted && !isConversionRemoved;

  if (progress.isDismissed || isConversionRemoved) return false;

  if (isUsdcToUsdg) return !isDepositSent;

  if (isWithdrawalCancelled || isConverted) return false;

  return isWithdrawalExecuted;
}

export function readStoredTransitRouteProgress(): TransitRouteProgress | undefined {
  return readLocalStorageItem(PAXOS_TRANSIT_ROUTE_PROGRESS_KEY, {
    deserializer: (value) => deserializeBigIntsInObject(JSON.parse(value)) as TransitRouteProgress,
  });
}

export function writeStoredTransitRouteProgress(progress: TransitRouteProgress) {
  writeLocalStorageItem(PAXOS_TRANSIT_ROUTE_PROGRESS_KEY, progress, {
    serializer: (value) => JSON.stringify(serializeBigIntsInObject(value)),
  });
}

export function removeStoredTransitRouteProgress() {
  removeLocalStorageItem(PAXOS_TRANSIT_ROUTE_PROGRESS_KEY);
}
