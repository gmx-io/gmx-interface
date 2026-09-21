import { bigMath } from "sdk/utils/bigmath";

import { getRewardsVestingAvailableAmount, getRewardsVestingEffectiveRemainingAmount } from "./rewardsVesting";
import type { RewardsVestingData } from "./useRewardsVestingData";

export const PAIR_RATIO_PRECISION = 10n ** 30n;

export type VestingTranche = {
  startTime: bigint;
  totalAmount: bigint;
  convertedAmount: bigint;
};

export type RatioVestingData = {
  pairRatioFactor: bigint;
  capUsedAmount: bigint;
  unpaidClaimAmount: bigint;
  deactivatedAt: bigint;
  isFrozen: boolean;
  isIssuerBindingConfirmed: boolean;
  esTokenAllowance: bigint;
  pairTokenAllowance: bigint;
  tranches: VestingTranche[];
};

export function getRatioVestingPairAmount(remainingAmount: bigint, pairRatioFactor: bigint) {
  return bigMath.divRoundUp(remainingAmount * pairRatioFactor, PAIR_RATIO_PRECISION);
}

export function getRatioVestingMaxDepositAmount({
  availableEsGmx,
  remainingAmount,
  currentPairAmount,
  availablePairAmount,
  pairRatioFactor,
}: {
  availableEsGmx: bigint;
  remainingAmount: bigint;
  currentPairAmount: bigint;
  availablePairAmount: bigint;
  pairRatioFactor: bigint;
}) {
  if (pairRatioFactor === 0n) return availableEsGmx;

  const supportedBalance = ((currentPairAmount + availablePairAmount) * PAIR_RATIO_PRECISION) / pairRatioFactor;
  return bigMath.min(availableEsGmx, bigMath.max(supportedBalance - remainingAmount, 0n));
}

export function getRatioVestingEndTimestamp(tranches: VestingTranche[], vestingDuration: bigint) {
  if (tranches.length === 0) return undefined;

  return tranches.reduce((end, tranche) => bigMath.max(end, tranche.startTime + vestingDuration), 0n);
}

export function isRatioVestingDepositDisabled(data: RatioVestingData, currentTimestamp: bigint) {
  return (
    !data.isIssuerBindingConfirmed ||
    data.isFrozen ||
    (data.deactivatedAt !== 0n && currentTimestamp >= data.deactivatedAt)
  );
}

export type RatioVestingDepositAction = "claim" | "approveEsGmx" | "approvePair" | "deposit";

export function getRatioVestingDepositPreview(data: RewardsVestingData, amount: bigint) {
  const ratio = data.ratioVesting!;
  const info = data.vestingInfo;
  const remainingAmount = getRewardsVestingEffectiveRemainingAmount({
    totalVestedAmount: info.vestedAmount,
    escrowedBalance: info.escrowedBalance,
    claimedAmount: info.claimedAmounts,
    claimableAmount: info.claimable,
    unpaidClaimAmount: ratio.unpaidClaimAmount,
  });
  const availableEsGmx = getRewardsVestingAvailableAmount({
    walletEsGmxAmount: data.walletEsGmxBalance + data.claimableEsGmxRewards,
    totalVestedAmount: info.vestedAmount,
    maxVestableAmount: info.maxVestableAmount,
    capUsedAmount: ratio.capUsedAmount,
  });
  const maxDepositAmount = getRatioVestingMaxDepositAmount({
    availableEsGmx,
    remainingAmount,
    currentPairAmount: info.pairAmount,
    availablePairAmount: data.freePairAmount,
    pairRatioFactor: ratio.pairRatioFactor,
  });
  const additionalPairAmount = bigMath.max(
    getRatioVestingPairAmount(remainingAmount + amount, ratio.pairRatioFactor) - info.pairAmount,
    0n
  );
  const steps: RatioVestingDepositAction[] = [];
  if (amount > data.walletEsGmxBalance) steps.push("claim");
  if (ratio.esTokenAllowance < amount) steps.push("approveEsGmx");
  if (ratio.pairTokenAllowance < additionalPairAmount) steps.push("approvePair");
  steps.push("deposit");
  return { availableEsGmx, maxDepositAmount, additionalPairAmount, action: steps[0], steps };
}
