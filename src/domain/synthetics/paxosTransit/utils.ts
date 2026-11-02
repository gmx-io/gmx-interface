import { isAddressEqual } from "viem";

import { HttpError } from "sdk/utils/http/http";
import type { TransitFeeTier, TransitFeeTierResponse, TransitRoute } from "sdk/utils/paxos/types";

export function getTransitMinOrderSize(
  routes: TransitRoute[] | undefined,
  p: { chainId: number; offerAsset: string | undefined; wantAsset: string | undefined }
): bigint | undefined {
  const { offerAsset, wantAsset } = p;

  if (!offerAsset || !wantAsset) {
    return undefined;
  }

  const route = routes?.find(
    (route) =>
      route.sourceChainId === p.chainId &&
      route.destinationChainId === p.chainId &&
      isAddressEqual(route.offerAsset, offerAsset) &&
      isAddressEqual(route.wantAsset, wantAsset)
  );

  return route?.minOrderSize;
}

export function getTransitFeeTier(p: {
  feeTierData: TransitFeeTierResponse | undefined;
  isWhitelistIgnored: boolean;
  isUsdcToUsdg: boolean;
  amount: bigint;
  zeroFeeMinOrderSize: bigint | undefined;
  isStandardFeeForced: boolean;
}): {
  isWhitelisted: boolean;
  isZeroFeePaused: boolean;
  isZeroFeeCapacityShort: boolean;
  feeTier: TransitFeeTier;
} {
  const isWhitelisted = p.feeTierData?.feeTier === "zeroFee" && !p.isWhitelistIgnored;
  const isZeroFeeOffered = isWhitelisted && p.isUsdcToUsdg;
  const isZeroFeePaused = isZeroFeeOffered && !p.feeTierData?.isZeroFeeAvailable;
  const zeroFeeCapacity = p.feeTierData?.zeroFeeCapacity ?? 0n;
  const isZeroFeeCapacityShort = isZeroFeeOffered && !isZeroFeePaused && zeroFeeCapacity < p.amount;
  const isBelowZeroFeeMinimum = p.zeroFeeMinOrderSize !== undefined && p.amount < p.zeroFeeMinOrderSize;
  const isZeroFee =
    isZeroFeeOffered && !isZeroFeePaused && !isZeroFeeCapacityShort && !isBelowZeroFeeMinimum && !p.isStandardFeeForced;

  return {
    isWhitelisted,
    isZeroFeePaused,
    isZeroFeeCapacityShort,
    feeTier: isZeroFee ? "zeroFee" : "standardFee",
  };
}

export function getIsZeroFeeRejection(error: unknown): boolean {
  return error instanceof HttpError && (error.statusCode === 403 || error.statusCode === 409);
}

export function getShouldUseTransit(p: {
  amountUsd: bigint;
  isWhitelisted: boolean;
  transitFeesUsd: bigint | undefined;
  collateralSwapTotalFeesDeltaUsd: bigint | undefined;
  thresholdUsd: bigint;
}): boolean {
  if (p.transitFeesUsd === undefined) {
    return false;
  }

  if (p.collateralSwapTotalFeesDeltaUsd === undefined) {
    return true;
  }

  const isLargeEnough = p.isWhitelisted || p.amountUsd >= p.thresholdUsd;

  return isLargeEnough && -p.transitFeesUsd > p.collateralSwapTotalFeesDeltaUsd;
}

export function getIsTransitQuoteNeeded(p: {
  isTransitRequired: boolean;
  isWhitelisted: boolean;
  collateralSwapTotalFeesDeltaUsd: bigint | undefined;
  amountUsd: bigint | undefined;
  thresholdUsd: bigint;
}): boolean {
  if (p.isTransitRequired || p.isWhitelisted || p.collateralSwapTotalFeesDeltaUsd === undefined) {
    return true;
  }

  return p.amountUsd !== undefined && p.amountUsd >= p.thresholdUsd;
}
