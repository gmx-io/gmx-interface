import { IHttp } from "utils/http/types";

import { FetchJitLiquidityInfoParams, JitLiquidityApiVersion, JitLiquidityMap } from "./types";
import { parseJitLiquidityResponse } from "./utils";

export async function fetchApiJitLiquidityInfo(
  ctx: { api: IHttp },
  params?: FetchJitLiquidityInfoParams
): Promise<JitLiquidityMap> {
  const response = await ctx.api.fetchJson<unknown>(getJitLiquidityApiPath(params?.apiVersion ?? "v1"));
  return parseJitLiquidityResponse(response);
}

function getJitLiquidityApiPath(apiVersion: JitLiquidityApiVersion) {
  return `/${apiVersion}/jit/liquidity_info`;
}
