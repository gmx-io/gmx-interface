import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useApiDataRequest } from "domain/synthetics/common/useApiDataRequest";
import { FreshnessMetricId } from "lib/metrics";
import type { ContractsChainId } from "sdk/configs/chains";
import type { StakingPowerResponse } from "sdk/utils/staking/types";

const STAKING_POWER_REFRESH_INTERVAL = 30_000;

export function useStakingPowerData(
  chainId: ContractsChainId,
  { account, enabled = true }: { account: string | null | undefined; enabled?: boolean }
) {
  const sdk = useGmxSdk(chainId);

  const { data: stakingPowerData, ...rest } = useApiDataRequest<StakingPowerResponse>(
    chainId,
    enabled && account && sdk ? ["apiStakingPower", chainId, account] : null,
    async () => sdk!.fetchStakingPower({ address: account! }),
    FreshnessMetricId.ApiStakingPower,
    { refreshInterval: STAKING_POWER_REFRESH_INTERVAL }
  );

  return {
    stakingPowerData,
    ...rest,
  };
}

export function getThresholdBalance(historicalMaxStaked: bigint): bigint {
  return (historicalMaxStaked * 80n) / 100n;
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
