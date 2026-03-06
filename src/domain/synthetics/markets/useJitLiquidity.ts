import { useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { buildUrl } from "lib/buildUrl";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import type { ContractsChainId } from "sdk/configs/chains";

const JIT_LIQUIDITY_UPDATE_INTERVAL = 30 * 1000;
const JIT_STALE_COOLDOWN_DURATION = 60 * 1000;

export type GlvShiftParam = {
  glv: string;
  fromMarket: string;
  toMarket: string;
  marketTokenAmount: bigint;
  minMarketTokens: bigint;
};

export type JitLiquidityInfo = {
  jitLiquidityLongUsd: bigint;
  jitLiquidityShortUsd: bigint;
  glvShiftParams: GlvShiftParam[];
  glv: string;
};

export type JitLiquidityData = {
  jitLiquidityMap: Map<string, JitLiquidityInfo> | undefined;
  markJitStale: (marketAddress: string) => void;
  refreshJitData: () => void;
};

type RawGlvShiftParam = {
  glv: string;
  fromMarket: string;
  toMarket: string;
  marketTokenAmount: string;
  minMarketTokens: string;
};

type RawLiquidityInfo = {
  glv: string;
  market: string;
  liquidityUsdForLongs: string;
  liquidityUsdForShorts: string;
  glvShiftParams: RawGlvShiftParam[];
};

type RawJitLiquidityResponse = {
  liquidityInfos: RawLiquidityInfo[];
};

/**
 * Look up the JitLiquidityInfo for a given market from the JIT liquidity map.
 * Handles the `.toLowerCase()` normalisation internally.
 */
export function getJitLiquidityInfo(
  jitLiquidityMap: Map<string, JitLiquidityInfo> | undefined,
  marketTokenAddress: string
): JitLiquidityInfo | undefined {
  return jitLiquidityMap?.get(marketTokenAddress.toLowerCase());
}

/**
 * Convenience helper that resolves the JIT liquidity USD for a single direction
 * (long or short) in one call, avoiding the repeated 2-line lookup pattern:
 *
 *   const jitInfo = jitLiquidityMap?.get(addr.toLowerCase());
 *   const jitUsd = isLong ? jitInfo?.jitLiquidityLongUsd : jitInfo?.jitLiquidityShortUsd;
 */
export function getJitLiquidityUsd(
  jitLiquidityMap: Map<string, JitLiquidityInfo> | undefined,
  marketTokenAddress: string,
  isLong: boolean
): bigint | undefined {
  const info = getJitLiquidityInfo(jitLiquidityMap, marketTokenAddress);
  return isLong ? info?.jitLiquidityLongUsd : info?.jitLiquidityShortUsd;
}

export function useJitLiquidity(chainId: ContractsChainId): JitLiquidityData {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const staleMarketsRef = useRef<Map<string, number>>(new Map());
  const [staleVersion, setStaleVersion] = useState(0);

  const { data, mutate } = useSWR<Map<string, JitLiquidityInfo> | undefined>(
    ["jitLiquidity", chainId],
    async () => {
      try {
        const url = buildUrl(oracleKeeperFetcher.url, "/jit/liquidity_info");
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`JIT liquidity fetch failed: ${res.status} ${res.statusText}`);
        }

        const response: RawJitLiquidityResponse = await res.json();

        if (!response?.liquidityInfos) {
          return undefined;
        }

        const map = new Map<string, JitLiquidityInfo>();

        for (const info of response.liquidityInfos) {
          const marketKey = info.market.toLowerCase();

          map.set(marketKey, {
            jitLiquidityLongUsd: BigInt(info.liquidityUsdForLongs),
            jitLiquidityShortUsd: BigInt(info.liquidityUsdForShorts),
            glvShiftParams: (info.glvShiftParams ?? []).map((param) => ({
              glv: param.glv,
              fromMarket: param.fromMarket,
              toMarket: param.toMarket,
              marketTokenAmount: BigInt(param.marketTokenAmount),
              minMarketTokens: BigInt(param.minMarketTokens),
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

  const markJitStale = (marketAddress: string) => {
    staleMarketsRef.current.set(marketAddress.toLowerCase(), Date.now());
    setStaleVersion((v) => v + 1);
  };

  const jitLiquidityMap = useMemo(() => {
    if (!data) {
      return undefined;
    }

    const now = Date.now();
    const filtered = new Map<string, JitLiquidityInfo>();

    for (const [market, info] of data) {
      const staleTimestamp = staleMarketsRef.current.get(market);

      if (staleTimestamp && staleTimestamp + JIT_STALE_COOLDOWN_DURATION > now) {
        continue;
      }

      filtered.set(market, info);
    }

    return filtered;
    // staleVersion ensures recomputation when markJitStale is called
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, staleVersion]);

  return {
    jitLiquidityMap,
    markJitStale,
    refreshJitData: mutate,
  };
}
