import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { ContractsChainId } from "config/chains";
import { GLV_MARKETS } from "config/markets";
import { parseContractPrice, TokenPricesData } from "domain/synthetics/tokens";
import { FreshnessMetricId, metrics, TickersErrorsCounter, TickersPartialDataCounter } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { _debugOracleKeeper } from "lib/oracleKeeperFetcher/_debug";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { LEADERBOARD_PRICES_UPDATE_INTERVAL, PRICES_UPDATE_INTERVAL } from "lib/timeConstants";
import { getToken, getTokenBySymbol, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { Token } from "sdk/utils/tokens/types";

import { tokenPricesCache } from "./tokenPricesCache";
import { useSequentialTimedSWR } from "./useSequentialTimedSWR";

export type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
  error?: Error;
  isPriceDataLoading: boolean;
};

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

  const key = enabled ? [chainId, oracleKeeperFetcher.url, "useTokenRecentPrices"] : null;

  const { data, error, isLoading } = useSequentialTimedSWR(key, {
    refreshInterval: refreshPricesInterval,
    refreshWhenHidden: true,

    fetcher: async ([chainId]) => {
      const priceItems = await oracleKeeperFetcher.fetchTickers().catch(() => {
        metrics.pushCounter<TickersErrorsCounter>("tickersErrors");
        return [];
      });

      const receivedPrices: TokenPricesData = {};

      priceItems.forEach((priceItem) => {
        const tokenConfig = getPriceTokenConfig(chainId, priceItem.tokenAddress);
        if (!tokenConfig) {
          return;
        }

        receivedPrices[tokenConfig.address] = {
          minPrice: parseContractPrice(BigInt(priceItem.minPrice), tokenConfig.decimals),
          maxPrice: parseContractPrice(BigInt(priceItem.maxPrice), tokenConfig.decimals),
        };
      });

      const { pricesData: result, missingAddresses } = tokenPricesCache.reconcile({
        chainId,
        pricesData: receivedPrices,
      });

      if (missingAddresses.length > 0) {
        // eslint-disable-next-line no-console
        console.warn("tickersPartialData", {
          missingAddresses,
          result,
          priceItems,
        });

        _debugOracleKeeper?.dispatchEvent({
          type: "tickers-partial",
          chainId: chainId,
          endpoint: oracleKeeperFetcher.url,
        });

        metrics.pushCounter<TickersPartialDataCounter>("tickersPartialData");
        oracleKeeperFetcher.handleFailure("tickers");
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

export function getPriceTokenConfig(chainId: ContractsChainId, tokenAddress: string): Token | undefined {
  try {
    return getToken(chainId, tokenAddress);
  } catch (e) {
    const glvConfig = Object.values(GLV_MARKETS[chainId] ?? {}).find(
      (glv) => glv.glvTokenAddress.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (!glvConfig) {
      return undefined;
    }

    return {
      ...getTokenBySymbol(chainId, "GLV"),
      address: glvConfig.glvTokenAddress,
    };
  }
}
