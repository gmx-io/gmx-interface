import { useMemo } from "react";
import useSWR from "swr";

import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchHyperliquidL2Books, fetchHyperliquidMetaAndAssetCtxs } from "./api";
import type { HyperliquidBookBundle, HyperliquidNormalizedMarket } from "./types";

export type HyperliquidMarketsResult = {
  markets: HyperliquidNormalizedMarket[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

export type HyperliquidBooksResult = {
  booksByCoin: Record<string, HyperliquidBookBundle> | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

export function useHyperliquidMarkets(): HyperliquidMarketsResult {
  const marketsRequest = useSWR(["tradingCosts", "hyperliquid", "metaAndAssetCtxs"], fetchHyperliquidMetaAndAssetCtxs, {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
  });

  return {
    markets: marketsRequest.data,
    isLoading: marketsRequest.isLoading,
    error: marketsRequest.error as Error | undefined,
  };
}

export function useHyperliquidL2Books(coins: string[] | undefined): HyperliquidBooksResult {
  const sortedCoins = useMemo(() => {
    return coins?.filter(Boolean).sort() ?? [];
  }, [coins]);

  const booksRequest = useSWR(
    sortedCoins.length ? ["tradingCosts", "hyperliquid", "l2Books", sortedCoins.join(",")] : null,
    () => fetchHyperliquidL2Books(sortedCoins),
    { refreshInterval: FREQUENT_UPDATE_INTERVAL }
  );

  return {
    booksByCoin: booksRequest.data,
    isLoading: booksRequest.isLoading,
    error: booksRequest.error as Error | undefined,
  };
}
