import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { LEADERBOARD_PRICES_UPDATE_INTERVAL, PRICES_UPDATE_INTERVAL } from "lib/timeConstants";
import { getToken, getTokenBySymbol, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { TokenPricesData } from "./types";
import { useSequentialTimedSWR } from "./useSequentialTimedSWR";
import { parseContractPrice } from "./utils";

type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
  error?: Error;
};

const ARBITRUM_SEPOLIA_USDC = getTokenBySymbol(ARBITRUM_SEPOLIA, "USDC");
const ARBITRUM_SEPOLIA_USDC_SG = getTokenBySymbol(ARBITRUM_SEPOLIA, "USDC.SG");

export function useTokenRecentPricesRequest(chainId: number): TokenPricesDataResult {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const pathname = useLocation().pathname;

  // TODO temp workaround
  const refreshPricesInterval = useMemo(() => {
    return pathname.startsWith("/leaderboard") || pathname.startsWith("/competitions")
      ? LEADERBOARD_PRICES_UPDATE_INTERVAL
      : PRICES_UPDATE_INTERVAL;
  }, [pathname]);

  const { data, error } = useSequentialTimedSWR([chainId, oracleKeeperFetcher.url, "useTokenRecentPrices"], {
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

          // TODO: remove this once we have a proper price for USDC.SG
          if (chainId === ARBITRUM_SEPOLIA && priceItem.tokenAddress === ARBITRUM_SEPOLIA_USDC.address) {
            result[ARBITRUM_SEPOLIA_USDC_SG.address] = {
              minPrice: parseContractPrice(BigInt(priceItem.minPrice), ARBITRUM_SEPOLIA_USDC_SG.decimals),
              maxPrice: parseContractPrice(BigInt(priceItem.maxPrice), ARBITRUM_SEPOLIA_USDC_SG.decimals),
            };
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
    error,
  };
}
