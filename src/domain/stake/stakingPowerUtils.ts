import { GMX_DECIMALS } from "lib/legacy";
import { bigintToNumber } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

export function getThresholdBalance(historicalMaxStaked: bigint): bigint {
  return (historicalMaxStaked * 80n + 99n) / 100n;
}

export function wouldTriggerReset(
  currentStaked: bigint,
  unstakeAmount: bigint,
  historicalMaxStaked: bigint | null
): boolean {
  if (historicalMaxStaked === null || historicalMaxStaked === 0n) return false;
  const newBalance = currentStaked - unstakeAmount;
  return newBalance * 100n < historicalMaxStaked * 80n;
}

export function getMaxSafeUnstake(currentStaked: bigint, historicalMaxStaked: bigint | null): bigint | null {
  if (historicalMaxStaked === null || historicalMaxStaked === 0n) return null;
  const threshold = getThresholdBalance(historicalMaxStaked);
  if (currentStaked <= threshold) return 0n;
  return currentStaked - threshold;
}

export function isLoyaltyTrackingActive(loyaltyTrackingStart: number): boolean {
  return Math.floor(Date.now() / 1000) >= loyaltyTrackingStart;
}

export function getUnstakeLimitPercent(safeUnstakeLimit: bigint | null, unstakeAmount: bigint | undefined): number {
  if (safeUnstakeLimit === null || unstakeAmount === undefined || unstakeAmount === 0n) return 0;
  if (safeUnstakeLimit === 0n) return 100;
  return Number(bigMath.mulDiv(unstakeAmount, 10000n, safeUnstakeLimit)) / 100;
}

export function getEffectiveHistoricalMax(
  stakingPowerData: { historicalMaxStaked: bigint | null } | undefined
): bigint | null {
  return stakingPowerData?.historicalMaxStaked ?? null;
}

export function getUserEstimatedApr({
  avgWeeklyBuybackGmx,
  userStakingPower,
  totalNetworkStakingPower,
  userStakedGmxAndEsGmx,
}: {
  avgWeeklyBuybackGmx: number | undefined;
  userStakingPower: bigint | undefined;
  totalNetworkStakingPower: bigint | undefined;
  userStakedGmxAndEsGmx: bigint | undefined;
}): number | undefined {
  if (avgWeeklyBuybackGmx === undefined) return undefined;
  if (userStakingPower === undefined || totalNetworkStakingPower === undefined) return undefined;
  if (userStakingPower <= 0n) return undefined;
  if (totalNetworkStakingPower <= 0n) return undefined;
  if (userStakedGmxAndEsGmx === undefined || userStakedGmxAndEsGmx <= 0n) return undefined;

  const userStakingPowerShare =
    bigintToNumber(userStakingPower, GMX_DECIMALS) / bigintToNumber(totalNetworkStakingPower, GMX_DECIMALS);
  const userAnnualizedRewardsGmx = avgWeeklyBuybackGmx * 52 * userStakingPowerShare;

  return userAnnualizedRewardsGmx / bigintToNumber(userStakedGmxAndEsGmx, GMX_DECIMALS);
}
