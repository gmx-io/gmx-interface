import { IHttp } from "utils/http/types";

import { GmPoolsYieldPnlParams, GmPoolsYieldPnlResponse } from "./types";

export async function fetchApiGmPoolYieldPnl(
  ctx: { api: IHttp },
  params?: GmPoolsYieldPnlParams
): Promise<GmPoolsYieldPnlResponse> {
  return ctx.api.fetchJson("/v1/yield/gm-pools", {
    query: {
      period: params?.period,
      pools: params?.pools,
      includeComponents: params?.includeComponents,
    },
  });
}
