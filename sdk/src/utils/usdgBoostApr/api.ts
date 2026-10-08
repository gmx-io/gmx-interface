import { IHttp } from "utils/http/types";

import { UsdgBoostAprResponse } from "./types";

export async function fetchApiUsdgBoostApr(ctx: { api: IHttp }): Promise<UsdgBoostAprResponse> {
  return ctx.api.fetchJson<UsdgBoostAprResponse>("/v1/incentives/usdg/boost-apr");
}
