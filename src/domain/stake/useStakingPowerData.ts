import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useApiDataRequest } from "domain/synthetics/common/useApiDataRequest";
import { FreshnessMetricId } from "lib/metrics";
import type { ContractsChainId } from "sdk/configs/chains";
import type { StakingPowerResponse } from "sdk/utils/staking/types";

export {
  getEffectiveHistoricalMax,
  getMaxSafeUnstake,
  getUnstakeLimitPercent,
  isLoyaltyTrackingActive,
  wouldTriggerReset,
} from "./stakingPowerUtils";

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

  const isDisabled = !enabled || !account || !sdk;
  const isLoading = !isDisabled && !stakingPowerData && !rest.error;

  return {
    stakingPowerData,
    isLoading,
    ...rest,
  };
}
