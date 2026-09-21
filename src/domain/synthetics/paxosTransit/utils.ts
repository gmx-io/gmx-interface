import type { TransitFeeTier, TransitFeeTierResponse } from "sdk/utils/paxos/types";

export function getTransitFeeTier(p: {
  feeTierData: TransitFeeTierResponse | undefined;
  isWhitelistIgnored: boolean;
  isUsdcOffered: boolean;
  amount: bigint;
  isStandardFeeForced: boolean;
}): { isWhitelisted: boolean; isZeroFeeCapacityShort: boolean; feeTier: TransitFeeTier } {
  const isWhitelisted = p.feeTierData?.feeTier === "zeroFee" && !p.isWhitelistIgnored;
  const zeroFeeCapacity = p.feeTierData?.zeroFeeCapacity ?? 0n;
  const isZeroFeeCapacityShort = isWhitelisted && p.isUsdcOffered && zeroFeeCapacity < p.amount;
  const isZeroFee = isWhitelisted && !isZeroFeeCapacityShort && !p.isStandardFeeForced;

  return { isWhitelisted, isZeroFeeCapacityShort, feeTier: isZeroFee ? "zeroFee" : "standardFee" };
}

export function getIsTransitQuoteNeeded(p: {
  isTransitRequired: boolean;
  isWhitelisted: boolean;
  swapFeesUsd: bigint | undefined;
  amountUsd: bigint | undefined;
  minAmountUsd: bigint;
}): boolean {
  if (p.isTransitRequired || p.isWhitelisted || p.swapFeesUsd === undefined) {
    return true;
  }

  return p.amountUsd !== undefined && p.amountUsd >= p.minAmountUsd;
}
