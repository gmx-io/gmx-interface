import useSWR from "swr";

import { getApiUrl, isApiSupported } from "sdk/configs/api";
import type { ContractsChainId } from "sdk/configs/chains";
import { buildUrl } from "sdk/utils/buildUrl";
import { deserializeBigIntsInObject } from "sdk/utils/numbers";
import type { StakingPowerResponse } from "sdk/utils/staking/types";

export {
  getEffectiveHistoricalMax,
  getMaxSafeUnstake,
  getThresholdBalance,
  getUnstakeLimitPercent,
  isLoyaltyTrackingActive,
  wouldTriggerReset,
} from "./stakingPowerUtils";

const STAKING_POWER_REFRESH_INTERVAL = 30_000;

async function fetchStakingPower(chainId: ContractsChainId, account: string): Promise<StakingPowerResponse> {
  const apiUrl = getApiUrl(chainId);
  if (!apiUrl) throw new Error("API not supported for this chain");

  const url = buildUrl(apiUrl, "/staking/power", { address: account });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Staking power API error: ${res.status}`);

  const data = await res.json();
  return deserializeBigIntsInObject(data, { handleInts: true }) as StakingPowerResponse;
}

export function useStakingPowerData(
  chainId: ContractsChainId,
  { account, enabled = true }: { account: string | null | undefined; enabled?: boolean }
) {
  const isSupported = isApiSupported(chainId);

  const { data: stakingPowerData, ...rest } = useSWR<StakingPowerResponse>(
    enabled && isSupported && account ? ["apiStakingPower", chainId, account] : null,
    () => fetchStakingPower(chainId, account!),
    { refreshInterval: STAKING_POWER_REFRESH_INTERVAL }
  );

  return {
    stakingPowerData,
    ...rest,
  };
}
