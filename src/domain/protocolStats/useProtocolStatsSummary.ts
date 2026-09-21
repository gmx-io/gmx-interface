import { getUiStatsApiUrl } from "config/api";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import {
  mergeFreshness,
  useSWRWithFreshness,
  type Freshness,
  type SWRWithFreshnessResult,
} from "lib/useSWRWithFreshness";
import { HttpClient } from "sdk/utils/http/http";
import { fetchApiProtocolStatsSummary } from "sdk/utils/stats/api";
import type {
  ProtocolStatsFilterParams,
  ProtocolStatsNetwork,
  ProtocolStatsSummaryResponse,
} from "sdk/utils/stats/types";

export type ProtocolStatsSummaryResult = SWRWithFreshnessResult<ProtocolStatsSummaryResponse>;

export function useProtocolStatsSummary(params?: ProtocolStatsFilterParams): ProtocolStatsSummaryResult {
  const apiUrl = getUiStatsApiUrl();

  return useSWRWithFreshness(
    apiUrl ? ["protocolStatsSummary", apiUrl, params?.networks, params?.versions] : null,
    async () => fetchApiProtocolStatsSummary({ api: new HttpClient(apiUrl!) }, params),
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );
}

// the api keeps summing a lagging source and only flags it, and a failed refresh leaves the whole response behind
export function getProtocolStatsNetworkFreshness(
  summary: ProtocolStatsSummaryResult,
  network: ProtocolStatsNetwork
): Freshness {
  const source = summary.data?.meta.sources.find((item) => item.network === network);
  const isSourceLagging = source !== undefined && source.health !== "fresh";

  return mergeFreshness(
    { isStale: isSourceLagging, asOf: isSourceLagging && source.asOf !== null ? source.asOf * 1000 : undefined },
    summary.freshness
  );
}
