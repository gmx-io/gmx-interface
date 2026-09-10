import useSWR from "swr";

import { getUiStatsApiUrl } from "config/api";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { HttpClient } from "sdk/utils/http/http";
import { fetchApiProtocolStatsSummary } from "sdk/utils/stats/api";
import type {
  ProtocolStatsFilterParams,
  ProtocolStatsNetwork,
  ProtocolStatsSummaryResponse,
} from "sdk/utils/stats/types";

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

// the api keeps summing a lagging source and only flags it, so the interface has to read the flag to show it
export function isProtocolStatsNetworkStale(
  data: ProtocolStatsSummaryResponse | undefined,
  network: ProtocolStatsNetwork
) {
  const source = data?.meta.sources.find((item) => item.network === network);

  return source !== undefined && source.health !== "fresh";
}
