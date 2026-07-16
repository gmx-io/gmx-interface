import { IHttp } from "utils/http/types";

import { FetchJitLiquidityInfoParams, JitLiquidityApiVersion, JitLiquidityMap, JitLiquiditySnapshot } from "./types";
import { parseJitLiquidityResponse, parseJitLiquiditySnapshotResponse } from "./utils";

export async function fetchApiJitLiquidityInfo(
  ctx: { api: IHttp },
  params?: FetchJitLiquidityInfoParams
): Promise<JitLiquidityMap> {
  const apiVersion = params?.apiVersion ?? "v1";
  const response = await ctx.api.fetchJson<unknown>(getJitLiquidityApiPath(apiVersion));
  if (apiVersion === "v2") {
    const snapshot = parseJitLiquiditySnapshotResponse(response);
    if (
      snapshot.status !== "available" ||
      snapshot.unavailableMarkets.length > 0 ||
      snapshot.unavailableSides.length > 0
    ) {
      throw new Error("JIT liquidity snapshot is stale or incomplete; use fetchJitLiquiditySnapshot for metadata");
    }
    return snapshot.jitLiquidityMap;
  }
  return parseJitLiquidityResponse(response);
}

export async function fetchApiJitLiquiditySnapshot(ctx: { api: IHttp }): Promise<JitLiquiditySnapshot> {
  const response = await ctx.api.fetchJson<unknown>(getJitLiquidityApiPath("v2"));
  return parseJitLiquiditySnapshotResponse(response);
}

function getJitLiquidityApiPath(apiVersion: JitLiquidityApiVersion) {
  return `/${apiVersion}/jit/liquidity_info`;
}
