import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { SECONDS_IN_DAY } from "lib/dates";
import { bigMath } from "sdk/utils/bigmath";

export type RewardsVestingSnapshot = {
  totalVestedAmount: bigint;
  escrowedBalance: bigint;
  claimedAmount: bigint;
  claimableAmount: bigint;
};

export type RewardsVestingPairAmountsParams = {
  effectiveRemainingAmount: bigint;
  depositAmount: bigint;
  averageStakedAmount: bigint;
  maxVestableAmount: bigint;
  currentPairAmount: bigint;
  availablePairAmount: bigint;
};

export type RewardsVestingPairAmounts = {
  projectedRemainingAmount: bigint;
  requiredPairAmount: bigint;
  additionalPairAmount: bigint;
  stakeShortfallAmount: bigint;
};

export type RewardsVestingDepositCapacityParams = {
  walletEsGmxAmount: bigint;
  totalVestedAmount: bigint;
  maxVestableAmount: bigint;
  effectiveRemainingAmount: bigint;
  averageStakedAmount: bigint;
  currentPairAmount: bigint;
  availablePairAmount: bigint;
};

export type RewardsVestingDepositCapacity = {
  remainingVestableAmount: bigint;
  maxDepositByPairAmount: bigint | undefined;
  maxDepositAmount: bigint;
};

export type RewardsVestingAvailableAmountParams = {
  walletEsGmxAmount: bigint;
  totalVestedAmount: bigint;
  maxVestableAmount: bigint;
};

export type RewardsVestingProgress = {
  totalAmount: bigint;
  completedAmount: bigint;
  remainingAmount: bigint;
  progressBps: bigint;
};

export type RewardsVestingDurationParams = {
  totalVestedAmount: bigint;
  effectiveRemainingAmount: bigint;
  vestingDuration: bigint;
};

function getNonNegativeAmount(amount: bigint): bigint {
  return bigMath.max(amount, 0n);
}

export function getRewardsVestingEffectiveRemainingAmount({
  totalVestedAmount,
  escrowedBalance,
  claimedAmount,
  claimableAmount,
}: RewardsVestingSnapshot): bigint {
  const balance = getNonNegativeAmount(escrowedBalance);
  const cumulativeClaimAmount = bigMath.max(getNonNegativeAmount(totalVestedAmount) - balance, 0n);
  const storedUnclaimedAmount = bigMath.max(cumulativeClaimAmount - getNonNegativeAmount(claimedAmount), 0n);
  const pendingVestingAmount = bigMath.clamp(
    getNonNegativeAmount(claimableAmount) - storedUnclaimedAmount,
    0n,
    balance
  );

  return balance - pendingVestingAmount;
}

export function getRewardsVestingPairAmounts({
  effectiveRemainingAmount,
  depositAmount,
  averageStakedAmount,
  maxVestableAmount,
  currentPairAmount,
  availablePairAmount,
}: RewardsVestingPairAmountsParams): RewardsVestingPairAmounts {
  const projectedRemainingAmount = getNonNegativeAmount(effectiveRemainingAmount) + getNonNegativeAmount(depositAmount);
  const averageStaked = getNonNegativeAmount(averageStakedAmount);
  const maxVestable = getNonNegativeAmount(maxVestableAmount);
  const currentPair = getNonNegativeAmount(currentPairAmount);
  const availablePair = getNonNegativeAmount(availablePairAmount);
  const requiredPairAmount =
    averageStaked === 0n || maxVestable === 0n
      ? 0n
      : bigMath.mulDiv(projectedRemainingAmount, averageStaked, maxVestable);
  const additionalPairAmount = bigMath.max(requiredPairAmount - currentPair, 0n);

  return {
    projectedRemainingAmount,
    requiredPairAmount,
    additionalPairAmount,
    stakeShortfallAmount: bigMath.max(additionalPairAmount - availablePair, 0n),
  };
}

export function getRewardsVestingDepositCapacity({
  walletEsGmxAmount,
  totalVestedAmount,
  maxVestableAmount,
  effectiveRemainingAmount,
  averageStakedAmount,
  currentPairAmount,
  availablePairAmount,
}: RewardsVestingDepositCapacityParams): RewardsVestingDepositCapacity {
  const walletBalance = getNonNegativeAmount(walletEsGmxAmount);
  const totalVested = getNonNegativeAmount(totalVestedAmount);
  const maxVestable = getNonNegativeAmount(maxVestableAmount);
  const remainingVestableAmount = bigMath.max(maxVestable - totalVested, 0n);
  const maxDepositWithoutPairLimit = bigMath.min(walletBalance, remainingVestableAmount);
  const averageStaked = getNonNegativeAmount(averageStakedAmount);

  if (averageStaked === 0n) {
    return {
      remainingVestableAmount,
      maxDepositByPairAmount: undefined,
      maxDepositAmount: maxDepositWithoutPairLimit,
    };
  }

  if (maxVestable === 0n) {
    return {
      remainingVestableAmount,
      maxDepositByPairAmount: 0n,
      maxDepositAmount: 0n,
    };
  }

  const pairCapacity = getNonNegativeAmount(currentPairAmount) + getNonNegativeAmount(availablePairAmount);
  // Invert Vester's floored pair requirement without losing the final accepted wei.
  const maxSupportedRemainingAmount = ((pairCapacity + 1n) * maxVestable - 1n) / averageStaked;
  const maxDepositByPairAmount = bigMath.max(
    maxSupportedRemainingAmount - getNonNegativeAmount(effectiveRemainingAmount),
    0n
  );

  return {
    remainingVestableAmount,
    maxDepositByPairAmount,
    maxDepositAmount: bigMath.min(maxDepositWithoutPairLimit, maxDepositByPairAmount),
  };
}

export function getRewardsVestingMaxDepositAmount(params: RewardsVestingDepositCapacityParams): bigint {
  return getRewardsVestingDepositCapacity(params).maxDepositAmount;
}

export function getRewardsVestingAvailableAmount({
  walletEsGmxAmount,
  totalVestedAmount,
  maxVestableAmount,
}: RewardsVestingAvailableAmountParams): bigint {
  const remainingVestableAmount = bigMath.max(
    getNonNegativeAmount(maxVestableAmount) - getNonNegativeAmount(totalVestedAmount),
    0n
  );

  return bigMath.min(getNonNegativeAmount(walletEsGmxAmount), remainingVestableAmount);
}

export function getRewardsVestingProgress({
  totalVestedAmount,
  effectiveRemainingAmount,
}: Pick<RewardsVestingDurationParams, "totalVestedAmount" | "effectiveRemainingAmount">): RewardsVestingProgress {
  const totalAmount = getNonNegativeAmount(totalVestedAmount);
  const remainingAmount = bigMath.clamp(getNonNegativeAmount(effectiveRemainingAmount), 0n, totalAmount);
  const completedAmount = totalAmount - remainingAmount;

  return {
    totalAmount,
    completedAmount,
    remainingAmount,
    progressBps: totalAmount === 0n ? 0n : bigMath.mulDiv(completedAmount, BASIS_POINTS_DIVISOR_BIGINT, totalAmount),
  };
}

export function getRewardsVestingRemainingDuration({
  totalVestedAmount,
  effectiveRemainingAmount,
  vestingDuration,
}: RewardsVestingDurationParams): bigint | undefined {
  const totalAmount = getNonNegativeAmount(totalVestedAmount);
  const duration = getNonNegativeAmount(vestingDuration);

  if (totalAmount === 0n || duration === 0n) return undefined;

  const remainingAmount = bigMath.clamp(getNonNegativeAmount(effectiveRemainingAmount), 0n, totalAmount);

  return bigMath.mulDiv(remainingAmount, duration, totalAmount, true);
}

export function getRewardsVestingEndTimestamp({
  currentTimestamp,
  ...durationParams
}: RewardsVestingDurationParams & { currentTimestamp: bigint }): bigint | undefined {
  const remainingDuration = getRewardsVestingRemainingDuration(durationParams);

  if (remainingDuration === undefined) return undefined;

  return getNonNegativeAmount(currentTimestamp) + remainingDuration;
}

export function getRewardsVestingDaysLeft({
  currentTimestamp,
  endTimestamp,
}: {
  currentTimestamp: bigint;
  endTimestamp: bigint;
}): bigint {
  const remainingDuration = bigMath.max(endTimestamp - currentTimestamp, 0n);

  if (remainingDuration === 0n) return 0n;

  return bigMath.divRoundUp(remainingDuration, BigInt(SECONDS_IN_DAY));
}
