import { IHttp } from "utils/http/types";

import type {
  ProtocolStatsFilterParams,
  ProtocolStatsSourceStatus,
  ProtocolStatsSummaryResponse,
  ProtocolStatsTimeseriesParams,
  ProtocolStatsTimeseriesResponse,
} from "./types";

function toListParam(values: readonly string[] | undefined): readonly string[] | undefined {
  return values && values.length > 0 ? values : undefined;
}

export async function fetchApiProtocolStatsSummary(
  ctx: { api: IHttp },
  params?: ProtocolStatsFilterParams
): Promise<ProtocolStatsSummaryResponse> {
  return ctx.api.fetchJson("/v1/stats/summary", {
    query: {
      networks: toListParam(params?.networks),
      versions: toListParam(params?.versions),
    },
  });
}

export async function fetchApiProtocolStatsTimeseries(
  ctx: { api: IHttp },
  params: ProtocolStatsTimeseriesParams
): Promise<ProtocolStatsTimeseriesResponse> {
  return ctx.api.fetchJson("/v1/stats/timeseries", {
    query: {
      metric: params.metric,
      groupBy: params.groupBy,
      networks: toListParam(params.networks),
      versions: toListParam(params.versions),
      from: params.from,
      to: params.to,
    },
  });
}

export async function fetchApiProtocolStatsSources(ctx: { api: IHttp }): Promise<ProtocolStatsSourceStatus[]> {
  return ctx.api.fetchJson("/v1/stats/sources");
}
