import useSWR from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { BuybackWeeklyStatsResponse } from "sdk/clients/v2";
import type { ContractsChainId } from "sdk/configs/chains";

export type { BuybackWeekData, BuybackMonthData, BuybackSummary, BuybackWeeklyStatsResponse } from "sdk/clients/v2";

export function useBuybackWeeklyStats(chainId: ContractsChainId) {
  const sdk = useGmxSdk(chainId);

  const { data, error, isLoading } = useSWR<BuybackWeeklyStatsResponse>(
    sdk ? ["buybackWeeklyStats", chainId] : null,
    async () => sdk!.fetchBuybackWeeklyStats(),
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return { data, error, isLoading };
}
