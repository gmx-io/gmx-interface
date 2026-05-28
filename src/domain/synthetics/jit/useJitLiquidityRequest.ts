import { useMemo } from "react";
import useSWR from "swr";

import { getUiApiCacheKey } from "config/api";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import type { ContractsChainId } from "sdk/configs/chains";

import { JitLiquidityData, JitLiquidityMap } from "./utils";
import { getIsV2JitLiquidityInfoEnabled, useUiFlagsRequest } from "../uiFlags/useUiFlagsRequest";

const JIT_LIQUIDITY_UPDATE_INTERVAL = 30 * 1000;

export function useJitLiquidityRequest(chainId: ContractsChainId, options?: { enabled?: boolean }): JitLiquidityData {
  const enabled = options?.enabled !== false;
  const { uiFlags } = useUiFlagsRequest();
  const isV2JitLiquidityInfoEnabled = getIsV2JitLiquidityInfoEnabled(uiFlags);
  const apiVersion = isV2JitLiquidityInfoEnabled ? "v2" : "v1";
  const sdk = useGmxSdk(chainId);
  const apiCacheKey = getUiApiCacheKey(chainId);

  const { data } = useSWR<JitLiquidityMap | undefined>(
    enabled && sdk ? ["jitLiquidity", apiCacheKey, apiVersion] : null,
    async () => {
      try {
        return sdk!.fetchJitLiquidityInfo({ apiVersion });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch JIT liquidity data", e);
        throw e;
      }
    },
    {
      refreshInterval: JIT_LIQUIDITY_UPDATE_INTERVAL,
    }
  );

  return useMemo(
    () => ({
      jitLiquidityMap: data,
    }),
    [data]
  );
}
