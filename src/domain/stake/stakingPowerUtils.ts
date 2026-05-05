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
  stakingPowerData: { historicalMaxStaked: bigint | null; currentStaked: bigint } | undefined,
  isTestMode: boolean
): bigint | null {
  if (!stakingPowerData) return null;
  return stakingPowerData.historicalMaxStaked ?? (isTestMode ? stakingPowerData.currentStaked : null);
}
