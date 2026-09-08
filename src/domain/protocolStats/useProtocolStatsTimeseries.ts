import useSWR from "swr";

import { getUiStatsApiUrl } from "config/api";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { HttpClient } from "sdk/utils/http/http";
import { fetchApiProtocolStatsTimeseries } from "sdk/utils/stats/api";
import type { ProtocolStatsTimeseriesParams, ProtocolStatsTimeseriesResponse } from "sdk/utils/stats/types";

export function useProtocolStatsTimeseries(params: ProtocolStatsTimeseriesParams) {
  const apiUrl = getUiStatsApiUrl();

  const { data, error, isLoading } = useSWR<ProtocolStatsTimeseriesResponse>(
    apiUrl ? ["protocolStatsTimeseries", apiUrl, params] : null,
    async () => fetchApiProtocolStatsTimeseries({ api: new HttpClient(apiUrl!) }, params),
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return { data, error, isLoading };
}
