import { IHttp } from "utils/http/types";

import { GmPoolsYieldPnlParams, GmPoolsYieldPnlResponse, GmUserEarningsParams, GmUserEarningsResponse } from "./types";

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

export async function fetchApiGmUserEarnings(
  ctx: { api: IHttp },
  params: GmUserEarningsParams
): Promise<GmUserEarningsResponse> {
  return ctx.api.fetchJson("/v1/yield/gm-user-earnings", {
    query: {
      account: params.account,
    },
  });
}
