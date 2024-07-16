import { getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import useSWR from "swr";
import { TokenPricesData } from "./types";
import { useOracleKeeperFetcher } from "./useOracleKeeperFetcher";
import { parseContractPrice } from "./utils";
import { useLocation } from "react-router-dom";
import { useMemo } from "react";

type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
};

export function useTokenRecentPricesRequest(chainId: number): TokenPricesDataResult {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const pathname = useLocation().pathname;

  // TODO temp workaround
  const refreshPricesInterval = useMemo(() => {
    return pathname.startsWith("/leaderboard") || pathname.startsWith("/competitions") ? 60_000 : 5000;
  }, [pathname]);

  const { data } = useSWR([chainId, oracleKeeperFetcher.url, "useTokenRecentPrices"], {
    refreshInterval: refreshPricesInterval,
    fetcher: ([chainId]) =>
      oracleKeeperFetcher.fetchTickers().then((priceItems) => {
        const result: TokenPricesData = {};

        priceItems.forEach((priceItem) => {
          let tokenConfig: any;

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
  });

  return {
    pricesData: data?.pricesData,
    updatedAt: data?.updatedAt,
  };
}
