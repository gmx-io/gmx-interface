import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { ContractsChainId } from "config/chains";
import { FreshnessMetricId, metrics, TickersErrorsCounter, TickersPartialDataCounter } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { _debugOracleKeeper } from "lib/oracleKeeperFetcher/_debug";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { LEADERBOARD_PRICES_UPDATE_INTERVAL, PRICES_CACHE_TTL, PRICES_UPDATE_INTERVAL } from "lib/timeConstants";
import { getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { Token } from "sdk/utils/tokens/types";

import { TokenPricesData } from "./types";
import { useSequentialTimedSWR } from "./useSequentialTimedSWR";
import { parseContractPrice } from "./utils";

export type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
  error?: Error;
  isPriceDataLoading: boolean;
};

const PRICES_CACHE: { [chainId: number]: TokenPricesData } = {};
const PRICES_CACHE_UPDATED: { [chainId: number]: { [address: string]: number } } = {};

export function useTokenRecentPricesRequest(
  chainId: ContractsChainId,
  params?: { enabled?: boolean }
): TokenPricesDataResult {
  const { enabled = true } = params ?? {};
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const pathname = useLocation().pathname;

  // TODO temp workaround
  const refreshPricesInterval = useMemo(() => {
    return pathname.startsWith("/leaderboard") || pathname.startsWith("/competitions")
      ? LEADERBOARD_PRICES_UPDATE_INTERVAL
      : PRICES_UPDATE_INTERVAL;
  }, [pathname]);

  PRICES_CACHE[chainId] = PRICES_CACHE[chainId] || {};
  PRICES_CACHE_UPDATED[chainId] = PRICES_CACHE_UPDATED[chainId] || {};

  const key = enabled ? [chainId, oracleKeeperFetcher.url, "useTokenRecentPrices"] : null;

  const { data, error, isLoading } = useSequentialTimedSWR(key, {
    refreshInterval: refreshPricesInterval,

    fetcher: async ([chainId]) => {
      const priceItems = await oracleKeeperFetcher.fetchTickers().catch(() => {
        metrics.pushCounter<TickersErrorsCounter>("tickersErrors");
        return [];
      });

      const result: TokenPricesData = {};

      priceItems.forEach((priceItem) => {
        let tokenConfig: Token;

        try {
          tokenConfig = getToken(chainId, priceItem.tokenAddress);
        } catch (e) {
          // ignore unknown token errors

          return;
        }

        const formattedPrices = {
          minPrice: parseContractPrice(BigInt(priceItem.minPrice), tokenConfig.decimals),
          maxPrice: parseContractPrice(BigInt(priceItem.maxPrice), tokenConfig.decimals),
        };

        result[tokenConfig.address] = formattedPrices;

        // Update cache of new received tokens
        PRICES_CACHE[chainId][tokenConfig.address] = formattedPrices;
        PRICES_CACHE_UPDATED[chainId][tokenConfig.address] = Date.now();
      });

      const hasPartialData = Object.keys(result).length < Object.keys(PRICES_CACHE[chainId]).length;

      if (hasPartialData) {
        // eslint-disable-next-line no-console
        console.warn("tickersPartialData", {
          result,
          priceItems,
          pricesCacheRef: PRICES_CACHE[chainId],
          pricesCacheUpdatedRef: PRICES_CACHE_UPDATED[chainId],
        });

        _debugOracleKeeper?.dispatchEvent({
          type: "tickers-partial",
          chainId: chainId,
          endpoint: oracleKeeperFetcher.url,
        });

        metrics.pushCounter<TickersPartialDataCounter>("tickersPartialData");
        oracleKeeperFetcher.handleFailure("tickers");

        Object.keys(PRICES_CACHE_UPDATED[chainId]).forEach((address) => {
          const cacheUpdatedAt = PRICES_CACHE_UPDATED[chainId][address];
          const canUseCache = cacheUpdatedAt && Date.now() - cacheUpdatedAt < PRICES_CACHE_TTL;

          if (!result[address] && canUseCache) {
            result[address] = PRICES_CACHE[chainId][address];
          }
        });
      }

      const wrappedToken = getWrappedToken(chainId);

      if (result[wrappedToken.address] && !result[NATIVE_TOKEN_ADDRESS]) {
        result[NATIVE_TOKEN_ADDRESS] = result[wrappedToken.address];
      }

      freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.Tickers);

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
