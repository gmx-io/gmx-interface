import { useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";

import { metrics, TickersErrorsCounter, TickersPartialDataCounter } from "lib/metrics";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { LEADERBOARD_PRICES_UPDATE_INTERVAL, PRICES_CACHE_TTL, PRICES_UPDATE_INTERVAL } from "lib/timeConstants";
import { getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { Token } from "sdk/types/tokens";

import { TokenPricesData } from "./types";
import { useSequentialTimedSWR } from "./useSequentialTimedSWR";
import { parseContractPrice } from "./utils";

export type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
  error?: Error;
  isPriceDataLoading: boolean;
};

export function useTokenRecentPricesRequest(chainId: number): TokenPricesDataResult {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const pathname = useLocation().pathname;

  // TODO temp workaround
  const refreshPricesInterval = useMemo(() => {
    return pathname.startsWith("/leaderboard") || pathname.startsWith("/competitions")
      ? LEADERBOARD_PRICES_UPDATE_INTERVAL
      : PRICES_UPDATE_INTERVAL;
  }, [pathname]);

  const pricesCacheRef = useRef<TokenPricesData>({});
  const pricesCacheUpdatedRef = useRef<{ [address: string]: number }>({});

  const { data, error, isLoading } = useSequentialTimedSWR([chainId, oracleKeeperFetcher.url, "useTokenRecentPrices"], {
    refreshInterval: refreshPricesInterval,

    keepPreviousData: true,

    fetcher: async ([chainId]) => {
      const result: TokenPricesData = {};

      let priceItems = await oracleKeeperFetcher
        .fetchTickers()
        .then(() => {
          // TODO: Remove this after testing
          if (localStorage.getItem("simulateTickersErrors") === "true") {
            throw new Error("Simulate Tickers Errors");
          }

          return priceItems;
        })
        .catch(() => {
          metrics.pushCounter<TickersErrorsCounter>("tickersErrors");
          return [];
        });

      // TODO: Remove this after testing
      if (localStorage.getItem("simulatePartialTickers") === "true") {
        priceItems = priceItems.slice(0, 9);
      }

      priceItems.forEach((priceItem) => {
        let tokenConfig: Token;

        try {
          tokenConfig = getToken(chainId, priceItem.tokenAddress);
        } catch (e) {
          // ignore unknown token errors

          return;
        }

        result[tokenConfig.address] = {
          minPrice: parseContractPrice(BigInt(priceItem.minPrice), tokenConfig.decimals),
          maxPrice: parseContractPrice(BigInt(priceItem.maxPrice), tokenConfig.decimals),
        };

        // Update cache of new received tokens
        pricesCacheRef.current[tokenConfig.address] = result[tokenConfig.address];
        pricesCacheUpdatedRef.current[tokenConfig.address] = Date.now();
      });

      const hasPartialData = Object.keys(result).length < Object.keys(pricesCacheRef.current).length;

      if (hasPartialData) {
        // eslint-disable-next-line no-console
        console.warn("tickersPartialData");
        metrics.pushCounter<TickersPartialDataCounter>("tickersPartialData");

        Object.keys(pricesCacheUpdatedRef.current).forEach((address) => {
          const cacheUpdatedAt = pricesCacheUpdatedRef.current[address];
          const canUseCache = cacheUpdatedAt && Date.now() - cacheUpdatedAt < PRICES_CACHE_TTL;

          if (!result[address] && canUseCache) {
            result[address] = pricesCacheRef.current[address];
          }
        });
      }

      const wrappedToken = getWrappedToken(chainId);

      if (result[wrappedToken.address] && !result[NATIVE_TOKEN_ADDRESS]) {
        result[NATIVE_TOKEN_ADDRESS] = result[wrappedToken.address];
      }

      return {
        pricesData: result,
        updatedAt: Date.now(),
      };
    },
  });

  return {
    pricesData: data?.pricesData,
    updatedAt: data?.updatedAt,
    error,
    isPriceDataLoading: isLoading,
  };
}
