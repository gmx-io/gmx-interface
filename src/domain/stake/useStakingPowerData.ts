import useSWR from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
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

  const { data: stakingPowerData, ...rest } = useSWR<StakingPowerResponse>(
    enabled && sdk && account ? ["apiStakingPower", chainId, account] : null,
    () => sdk!.fetchStakingPower({ address: account! }),
    { refreshInterval: STAKING_POWER_REFRESH_INTERVAL }
  );

  return {
    stakingPowerData,
    ...rest,
  };
}
