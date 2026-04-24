import useSWR from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { BuybackWeeklyStatsResponse } from "sdk/clients/v2";
import { ARBITRUM } from "sdk/configs/chains";

export type { BuybackWeekData, BuybackSummary, BuybackWeeklyStatsResponse } from "sdk/clients/v2";

export function useBuybackWeeklyStats() {
  const sdk = useGmxSdk(ARBITRUM);

  const { data, error, isLoading } = useSWR<BuybackWeeklyStatsResponse>(
    sdk ? ["buybackWeeklyStats", ARBITRUM] : null,
    async () => sdk!.fetchBuybackWeeklyStats(),
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return { data, error, isLoading };
}
