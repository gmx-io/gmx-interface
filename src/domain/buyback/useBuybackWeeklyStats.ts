import useSWR from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useChainId } from "lib/chains";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { BuybackWeeklyStatsResponse } from "sdk/clients/v2";
import type { ContractsChainId } from "sdk/configs/chains";

export type { BuybackWeekData, BuybackSummary, BuybackWeeklyStatsResponse } from "sdk/clients/v2";

export function useBuybackWeeklyStats() {
  const { chainId } = useChainId();
  const sdk = useGmxSdk(chainId as ContractsChainId);

  const { data, error, isLoading } = useSWR<BuybackWeeklyStatsResponse>(
    sdk ? ["buybackWeeklyStats", chainId] : null,
    async () => sdk!.fetchBuybackWeeklyStats(),
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return { data, error, isLoading };
}
