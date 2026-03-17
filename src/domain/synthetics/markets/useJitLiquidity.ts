import { useMemo } from "react";
import useSWR from "swr";

import { getApiUrl } from "sdk/configs/api";
import type { ContractsChainId } from "sdk/configs/chains";

const JIT_LIQUIDITY_UPDATE_INTERVAL = 30 * 1000;

export type GlvShiftParam = {
  glv: string;
  fromMarket: string;
  toMarket: string;
  marketTokenAmount: bigint;
  minMarketTokens: bigint;
};

export type JitLiquidityInfo = {
  maxReservedUsdWithJitLong: bigint;
  maxReservedUsdWithJitShort: bigint;
  glvShiftParams: GlvShiftParam[];
  glv: string;
};

export type JitLiquidityData = {
  jitLiquidityMap: Map<string, JitLiquidityInfo> | undefined;
};

export function getJitLiquidityInfo(
  jitLiquidityMap: Map<string, JitLiquidityInfo> | undefined,
  marketTokenAddress: string
): JitLiquidityInfo | undefined {
  return jitLiquidityMap?.get(marketTokenAddress.toLowerCase());
}

export function getJitMaxReservedUsd(
  jitLiquidityMap: Map<string, JitLiquidityInfo> | undefined,
  marketTokenAddress: string,
  isLong: boolean
): bigint | undefined {
  const info = getJitLiquidityInfo(jitLiquidityMap, marketTokenAddress);
  return isLong ? info?.maxReservedUsdWithJitLong : info?.maxReservedUsdWithJitShort;
}

function safeParseBigInt(value: string): bigint {
  const parsed = BigInt(value);
  return parsed < 0n ? 0n : parsed;
}

export function useJitLiquidity(chainId: ContractsChainId, options?: { enabled?: boolean }): JitLiquidityData {
  const enabled = options?.enabled !== false;

  const { data } = useSWR<Map<string, JitLiquidityInfo> | undefined>(
    enabled ? ["jitLiquidity", chainId] : null,
    async () => {
      try {
        const apiUrl = getApiUrl(chainId);

        if (!apiUrl) {
          return undefined;
        }

        const res = await fetch(`${apiUrl}/jit/liquidity_info`);
        const response = await res.json();

        const map = new Map<string, JitLiquidityInfo>();

        for (const info of response.liquidityInfos) {
          const marketKey = info.market.toLowerCase();

          map.set(marketKey, {
            maxReservedUsdWithJitLong: safeParseBigInt(info.maxReservedUsdWithJitLong),
            maxReservedUsdWithJitShort: safeParseBigInt(info.maxReservedUsdWithJitShort),
            glvShiftParams: (info.glvShiftParams ?? []).map((param) => ({
              glv: param.glv,
              fromMarket: param.fromMarket,
              toMarket: param.toMarket,
              marketTokenAmount: safeParseBigInt(param.marketTokenAmount),
              minMarketTokens: safeParseBigInt(param.minMarketTokens),
            })),
            glv: info.glv,
          });
        }

        return map;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch JIT liquidity data", e);
        return undefined;
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
