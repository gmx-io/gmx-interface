import { isAddressEqual } from "viem";

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
  isUsdcOffered: boolean;
  amount: bigint;
  zeroFeeMinOrderSize: bigint | undefined;
  isStandardFeeForced: boolean;
}): {
  isWhitelisted: boolean;
  isZeroFeeCapacityShort: boolean;
  isBelowZeroFeeMinimum: boolean;
  feeTier: TransitFeeTier;
} {
  const isWhitelisted = p.feeTierData?.feeTier === "zeroFee" && !p.isWhitelistIgnored;
  const zeroFeeCapacity = p.feeTierData?.zeroFeeCapacity ?? 0n;
  const isZeroFeeCapacityShort = isWhitelisted && p.isUsdcOffered && zeroFeeCapacity < p.amount;
  const isBelowZeroFeeMinimum =
    isWhitelisted && p.zeroFeeMinOrderSize !== undefined && p.amount < p.zeroFeeMinOrderSize;
  const isZeroFee = isWhitelisted && !isZeroFeeCapacityShort && !isBelowZeroFeeMinimum && !p.isStandardFeeForced;

  return {
    isWhitelisted,
    isZeroFeeCapacityShort,
    isBelowZeroFeeMinimum,
    feeTier: isZeroFee ? "zeroFee" : "standardFee",
  };
}

export function getShouldUseTransit(p: {
  amountUsd: bigint;
  isWhitelisted: boolean;
  transitFeesUsd: bigint | undefined;
  collateralSwapTotalFeesDeltaUsd: bigint | undefined;
  minAmountUsd: bigint;
}): boolean {
  if (p.isWhitelisted) {
    return true;
  }

  if (p.transitFeesUsd === undefined) {
    return false;
  }

  if (p.collateralSwapTotalFeesDeltaUsd === undefined) {
    return true;
  }

  return p.amountUsd >= p.minAmountUsd && -p.transitFeesUsd > p.collateralSwapTotalFeesDeltaUsd;
}

export function getIsTransitQuoteNeeded(p: {
  isTransitRequired: boolean;
  isWhitelisted: boolean;
  collateralSwapTotalFeesDeltaUsd: bigint | undefined;
  amountUsd: bigint | undefined;
  minAmountUsd: bigint;
}): boolean {
  if (p.isTransitRequired || p.isWhitelisted || p.collateralSwapTotalFeesDeltaUsd === undefined) {
    return true;
  }

  return p.amountUsd !== undefined && p.amountUsd >= p.minAmountUsd;
}
