import { useMemo } from "react";
import useSWR from "swr";

import { getApiUrl } from "sdk/configs/api";
import type { ContractsChainId } from "sdk/configs/chains";

import { JitLiquidityData, JitLiquidityInfo, parseJitLiquidityResponse } from "./utils";
import { getIsV2JitLiquidityInfoEnabled, useUiFlagsRequest } from "../uiFlags/useUiFlagsRequest";

const JIT_LIQUIDITY_UPDATE_INTERVAL = 30 * 1000;

export function useJitLiquidityRequest(chainId: ContractsChainId, options?: { enabled?: boolean }): JitLiquidityData {
  const enabled = options?.enabled !== false;
  const { uiFlags } = useUiFlagsRequest();
  const isV2JitLiquidityInfoEnabled = getIsV2JitLiquidityInfoEnabled(uiFlags);

  const { data } = useSWR<Record<string, JitLiquidityInfo> | undefined>(
    enabled ? ["jitLiquidity", chainId, isV2JitLiquidityInfoEnabled ? "v2" : "v1"] : null,
    async () => {
      try {
        const apiUrl = getApiUrl(chainId);

        if (!apiUrl) {
          return undefined;
        }

        const jitApiUrl = getJitApiUrl(apiUrl, isV2JitLiquidityInfoEnabled);
        const res = await fetch(`${jitApiUrl}/jit/liquidity_info`);
        const response = await res.json();

        return parseJitLiquidityResponse(response, isV2JitLiquidityInfoEnabled);
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

function getJitApiUrl(apiUrl: string, isV2JitLiquidityInfoEnabled: boolean): string {
  if (!isV2JitLiquidityInfoEnabled) {
    return apiUrl;
  }

  return apiUrl.replace(/\/v1\/?$/, "/v2");
}
