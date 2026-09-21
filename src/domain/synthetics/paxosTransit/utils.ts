import maxBy from "lodash/maxBy";
import { isAddressEqual } from "viem";

import type { WithdrawalStatus, WithdrawalStatuses } from "context/SyntheticsEvents/types";
import type { TransitFeeTier, TransitFeeTierResponse } from "sdk/utils/paxos/types";

export function findTransitWithdrawalStatus(
  withdrawalStatuses: WithdrawalStatuses,
  p: { account: string | undefined; poolAddress: string | undefined; convertedWithdrawalKeys: string[] }
): WithdrawalStatus | undefined {
  const { account, poolAddress } = p;

  if (!account || !poolAddress) {
    return undefined;
  }

  const withdrawalStatusesOfPool = Object.values(withdrawalStatuses).filter(
    (status) =>
      status.data !== undefined &&
      status.cancelledTxnHash === undefined &&
      !p.convertedWithdrawalKeys.includes(status.key) &&
      isAddressEqual(status.data.receiver, account) &&
      isAddressEqual(status.data.marketAddress, poolAddress)
  );

  return maxBy(withdrawalStatusesOfPool, (status) => status.createdAt);
}

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
