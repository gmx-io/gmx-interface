import useSWR from "swr";

import { getUiStatsApiUrl } from "config/api";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { HttpClient } from "sdk/utils/http/http";
import { fetchApiProtocolStatsSummary } from "sdk/utils/stats/api";
import type { ProtocolStatsFilterParams, ProtocolStatsSummaryResponse } from "sdk/utils/stats/types";

export function useProtocolStatsSummary(params?: ProtocolStatsFilterParams) {
  const apiUrl = getUiStatsApiUrl();

  const { data, error, isLoading } = useSWR<ProtocolStatsSummaryResponse>(
    apiUrl ? ["protocolStatsSummary", apiUrl, params?.networks, params?.versions] : null,
    async () => fetchApiProtocolStatsSummary({ api: new HttpClient(apiUrl!) }, params),
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return { data, error, isLoading };
}
