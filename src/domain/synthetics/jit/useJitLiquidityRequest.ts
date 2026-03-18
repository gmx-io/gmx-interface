import { useMemo } from "react";
import useSWR from "swr";

import { getApiUrl } from "sdk/configs/api";
import type { ContractsChainId } from "sdk/configs/chains";

import { JitLiquidityData, JitLiquidityInfo, safeParseBigInt } from "./utils";

const JIT_LIQUIDITY_UPDATE_INTERVAL = 30 * 1000;

export function useJitLiquidityRequest(chainId: ContractsChainId, options?: { enabled?: boolean }): JitLiquidityData {
  const enabled = options?.enabled !== false;

  const { data } = useSWR<Record<string, JitLiquidityInfo> | undefined>(
    enabled ? ["jitLiquidity", chainId] : null,
    async () => {
      try {
        const apiUrl = getApiUrl(chainId);

        if (!apiUrl) {
          return undefined;
        }

        const res = await fetch(`${apiUrl}/jit/liquidity_info`);
        const response = await res.json();

        const result: Record<string, JitLiquidityInfo> = {};

        for (const info of response.liquidityInfos) {
          const marketKey = info.market.toLowerCase();

          result[marketKey] = {
            maxReservedUsdWithJitLong: safeParseBigInt(info.maxReservedUsdWithJitLong),
            maxReservedUsdWithJitShort: safeParseBigInt(info.maxReservedUsdWithJitShort),
            glvShiftParams: (info.glvShiftParams ?? []).map((param: any) => ({
              glv: param.glv,
              fromMarket: param.fromMarket,
              toMarket: param.toMarket,
              marketTokenAmount: safeParseBigInt(param.marketTokenAmount),
              minMarketTokens: safeParseBigInt(param.minMarketTokens),
            })),
            glv: info.glv,
          };
        }

        return result;
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
