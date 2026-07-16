import { useEffect, useReducer } from "react";
import useSWR from "swr";

import { getUiApiCacheKey } from "config/api";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import type { ContractsChainId } from "sdk/configs/chains";
import { getSafeJitLiquidityMap } from "sdk/utils/jitLiquidity/api";
import type { JitLiquidityData, JitLiquidityMap, JitLiquiditySnapshot } from "sdk/utils/jitLiquidity/types";
import { JIT_LIQUIDITY_MAX_FRESH_AGE_MS } from "sdk/utils/jitLiquidity/utils";

import { getIsV2JitLiquidityInfoEnabled, useUiFlagsRequest } from "../uiFlags/useUiFlagsRequest";

const JIT_LIQUIDITY_UPDATE_INTERVAL = 30 * 1000;
const JIT_LIQUIDITY_V2_UPDATE_INTERVAL = 5 * 1000;

type JitLiquidityRequestResult =
  | { apiVersion: "v1"; jitLiquidityMap: JitLiquidityMap }
  | { apiVersion: "v2"; snapshot: JitLiquiditySnapshot };

export function useJitLiquidityRequest(chainId: ContractsChainId, options?: { enabled?: boolean }): JitLiquidityData {
  const enabled = options?.enabled !== false;
  const { uiFlags } = useUiFlagsRequest();
  const isV2JitLiquidityInfoEnabled = getIsV2JitLiquidityInfoEnabled(uiFlags);
  const apiVersion = isV2JitLiquidityInfoEnabled ? "v2" : "v1";
  const sdk = useGmxSdk(chainId);
  const apiCacheKey = getUiApiCacheKey(chainId);

  const { data, error } = useSWR<JitLiquidityRequestResult | undefined>(
    enabled && sdk ? ["jitLiquidity", apiCacheKey, apiVersion] : null,
    async () => {
      try {
        return apiVersion === "v2"
          ? { apiVersion, snapshot: await sdk!.fetchJitLiquiditySnapshot() }
          : { apiVersion, jitLiquidityMap: await sdk!.fetchJitLiquidityInfo({ apiVersion }) };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch JIT liquidity data", e);
        throw e;
      }
    },
    {
      refreshInterval: apiVersion === "v2" ? JIT_LIQUIDITY_V2_UPDATE_INTERVAL : JIT_LIQUIDITY_UPDATE_INTERVAL,
    }
  );

  const [, expireSnapshot] = useReducer((value) => value + 1, 0);
  useEffect(() => {
    if (data?.apiVersion !== "v2") {
      return;
    }

    const expiresIn = data.snapshot.generatedAt + JIT_LIQUIDITY_MAX_FRESH_AGE_MS - Date.now();
    if (expiresIn < 0) {
      return;
    }

    const timeout = setTimeout(expireSnapshot, expiresIn + 1);
    return () => clearTimeout(timeout);
  }, [data]);

  return {
    jitLiquidityMap:
      error || !data
        ? undefined
        : data.apiVersion === "v2"
          ? getSafeJitLiquidityMap(data.snapshot)
          : data.jitLiquidityMap,
  };
}
