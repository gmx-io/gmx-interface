import { getUiStatsApiUrl } from "config/api";
import { getCurrentEpochStartedTimestamp } from "domain/stats";
import { getWeekAgoTimestamp } from "domain/stats/getWeekAgoTimestamp";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { useSWRWithFreshness, type SWRWithFreshnessResult } from "lib/useSWRWithFreshness";
import { HttpClient } from "sdk/utils/http/http";
import { fetchApiProtocolStatsTimeseries } from "sdk/utils/stats/api";
import type { ProtocolStatsFilterParams } from "sdk/utils/stats/types";

import { getProtocolStatsFeesWindows, type ProtocolStatsFeesWindows } from "./utils";

export function useProtocolStatsFeesInfo(
  params?: ProtocolStatsFilterParams
): SWRWithFreshnessResult<ProtocolStatsFeesWindows> {
  const apiUrl = getUiStatsApiUrl();

  return useSWRWithFreshness(
    apiUrl ? ["protocolStatsFeesInfo", apiUrl, params?.networks, params?.versions] : null,
    async () => {
      const epochStartedTimestamp = getCurrentEpochStartedTimestamp();
      const weekAgoTimestamp = getWeekAgoTimestamp();
      const series = await fetchApiProtocolStatsTimeseries(
        { api: new HttpClient(apiUrl!) },
        { ...params, metric: "fees.total", groupBy: "none", from: weekAgoTimestamp }
      );

      return getProtocolStatsFeesWindows(series.groups[0]?.points ?? [], { epochStartedTimestamp, weekAgoTimestamp });
    },
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );
}
