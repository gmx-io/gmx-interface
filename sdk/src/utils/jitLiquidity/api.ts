import { getAddress } from "viem";

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
    return getSafeJitLiquidityMap(snapshot);
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

function getSafeJitLiquidityMap(snapshot: JitLiquiditySnapshot): JitLiquidityMap {
  if (snapshot.status === "stale") {
    return {};
  }

  const unavailableMarkets = new Set(snapshot.unavailableMarkets.map(getAddress));
  const unavailableSides = new Map<string, { long?: boolean; short?: boolean }>();
  for (const side of snapshot.unavailableSides) {
    const market = getAddress(side.market);
    const flags = unavailableSides.get(market) ?? {};
    flags[side.isLong ? "long" : "short"] = true;
    unavailableSides.set(market, flags);
  }

  const result: JitLiquidityMap = {};
  for (const [market, info] of Object.entries(snapshot.jitLiquidityMap)) {
    const marketKey = getAddress(market);
    if (unavailableMarkets.has(marketKey)) {
      continue;
    }

    const flags = unavailableSides.get(marketKey);
    const glvShiftParamsLong = flags?.long ? [] : info.glvShiftParamsLong;
    const glvShiftParamsShort = flags?.short ? [] : info.glvShiftParamsShort;
    result[market] = {
      ...info,
      maxReservedUsdWithJitLong: flags?.long ? 0n : info.maxReservedUsdWithJitLong,
      maxReservedUsdWithJitShort: flags?.short ? 0n : info.maxReservedUsdWithJitShort,
      glvShiftParamsLong,
      glvShiftParamsShort,
      glvShiftParams: [...glvShiftParamsLong, ...glvShiftParamsShort],
    };
  }

  return result;
}
