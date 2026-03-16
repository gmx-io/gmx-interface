import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { getApiUrl } from "sdk/configs/api";
import type { ContractsChainId } from "sdk/configs/chains";

const JIT_LIQUIDITY_UPDATE_INTERVAL = 30 * 1000;
const JIT_STALE_MIN_COOLDOWN = 5 * 1000;
const JIT_STALE_MAX_COOLDOWN = 60 * 1000;
const JIT_STALE_REFETCH_DELAY = 7 * 1000;

type StaleEntry = {
  timestamp: number;
  fetchGeneration: number;
};

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
  markJitStale: (marketAddress: string) => void;
  refreshJitData: () => void;
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
  const staleMarketsRef = useRef<Map<string, StaleEntry>>(new Map());
  const fetchGenerationRef = useRef(0);
  const [staleVersion, setStaleVersion] = useState(0);
  const delayedRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, mutate } = useSWR<Map<string, JitLiquidityInfo> | undefined>(
    enabled ? ["jitLiquidity", chainId] : null,
    async () => {
      try {
        const apiUrl = getApiUrl(chainId);

        if (!apiUrl) {
          return undefined;
        }

        const res = await fetch(`${apiUrl}/jit/liquidity_info`);
        const response = await res.json();

        fetchGenerationRef.current += 1;

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

  useEffect(() => {
    return () => {
      if (delayedRefetchTimerRef.current) {
        clearTimeout(delayedRefetchTimerRef.current);
      }
    };
  }, []);

  const markJitStale = useCallback(
    (marketAddress: string) => {
      staleMarketsRef.current.set(marketAddress.toLowerCase(), {
        timestamp: Date.now(),
        fetchGeneration: fetchGenerationRef.current,
      });
      setStaleVersion((v) => v + 1);

      if (delayedRefetchTimerRef.current) {
        clearTimeout(delayedRefetchTimerRef.current);
      }
      delayedRefetchTimerRef.current = setTimeout(() => {
        mutate();
        delayedRefetchTimerRef.current = null;
      }, JIT_STALE_REFETCH_DELAY);
    },
    [mutate]
  );

  const jitLiquidityMap = useMemo(() => {
    if (!data) {
      return undefined;
    }

    const now = Date.now();
    const currentGeneration = fetchGenerationRef.current;
    const filtered = new Map<string, JitLiquidityInfo>();

    for (const [market, info] of data) {
      const staleEntry = staleMarketsRef.current.get(market);

      if (staleEntry) {
        const elapsed = now - staleEntry.timestamp;

        if (elapsed >= JIT_STALE_MAX_COOLDOWN) {
          staleMarketsRef.current.delete(market);
        } else if (elapsed < JIT_STALE_MIN_COOLDOWN) {
          continue;
          // Suppress until a fetch beyond the immediate refetch completes
        } else if (currentGeneration <= staleEntry.fetchGeneration + 1) {
          continue;
        } else {
          staleMarketsRef.current.delete(market);
        }
      }

      filtered.set(market, info);
    }

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, staleVersion]);

  return useMemo(
    () => ({
      jitLiquidityMap,
      markJitStale,
      refreshJitData: mutate,
    }),
    [jitLiquidityMap, markJitStale, mutate]
  );
}
