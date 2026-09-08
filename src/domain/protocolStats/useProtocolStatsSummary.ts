import useSWR from "swr";

import { getUiStatsApiUrl } from "config/api";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { HttpClient } from "sdk/utils/http/http";
import { fetchApiProtocolStatsSummary } from "sdk/utils/stats/api";
import type { ProtocolStatsSummaryResponse } from "sdk/utils/stats/types";

export function useProtocolStatsSummary() {
  const apiUrl = getUiStatsApiUrl();

  const { data, error, isLoading } = useSWR<ProtocolStatsSummaryResponse>(
    apiUrl ? ["protocolStatsSummary", apiUrl] : null,
    async () => fetchApiProtocolStatsSummary({ api: new HttpClient(apiUrl!) }),
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return { data, error, isLoading };
}
