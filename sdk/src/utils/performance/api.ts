import { IHttp } from "utils/http/types";

import { PerformanceAnnualized, PerformanceParams, PerformanceSnapshots } from "./types";

export async function fetchApiPerformanceAnnualized(
  ctx: { api: IHttp },
  params?: PerformanceParams
): Promise<PerformanceAnnualized[]> {
  return ctx.api.fetchJson("/v1/performance/annualized", {
    query: {
      period: params?.period,
      address: params?.address,
    },
  });
}

export async function fetchApiPerformanceSnapshots(
  ctx: { api: IHttp },
  params?: PerformanceParams
): Promise<PerformanceSnapshots[]> {
  return ctx.api.fetchJson("/v1/performance/snapshots", {
    query: {
      period: params?.period,
      address: params?.address,
    },
  });
}
