import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { LEADERBOARD_PRICES_UPDATE_INTERVAL, PRICES_UPDATE_INTERVAL } from "lib/timeConstants";
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

export function useTokenRecentPricesRequest(chainId: number, params?: { enabled?: boolean }): TokenPricesDataResult {
  const { enabled = true } = params ?? {};
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const pathname = useLocation().pathname;

  // TODO temp workaround
  const refreshPricesInterval = useMemo(() => {
    return pathname.startsWith("/leaderboard") || pathname.startsWith("/competitions")
      ? LEADERBOARD_PRICES_UPDATE_INTERVAL
      : PRICES_UPDATE_INTERVAL;
  }, [pathname]);

  const { data, error, isLoading } = useSequentialTimedSWR(
    enabled ? [chainId, oracleKeeperFetcher.url, "useTokenRecentPrices"] : undefined,
    {
      refreshInterval: refreshPricesInterval,
      keepPreviousData: true,

      fetcher: ([chainId]) =>
        oracleKeeperFetcher.fetchTickers().then((priceItems) => {
          const result: TokenPricesData = {};

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
          });

          const wrappedToken = getWrappedToken(chainId);

          if (result[wrappedToken.address] && !result[NATIVE_TOKEN_ADDRESS]) {
            result[NATIVE_TOKEN_ADDRESS] = result[wrappedToken.address];
          }

          return {
            pricesData: result,
            updatedAt: Date.now(),
          };
        }),
      refreshWhenHidden: true,
    }
  );

  return {
    pricesData: data?.pricesData,
    updatedAt: data?.updatedAt,
    error,
    isPriceDataLoading: isLoading,
  };
}
