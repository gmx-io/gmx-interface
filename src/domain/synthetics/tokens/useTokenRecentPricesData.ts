import { getToken, getV2Tokens, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import useSWR from "swr";
import { TokenPricesData } from "./types";
import { useOracleKeeperFetcher } from "./useOracleKeeperFetcher";
import { parseOraclePrice } from "./utils";

type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
};

export function useTokenRecentPrices(chainId: number): TokenPricesDataResult {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data } = useSWR([chainId, oracleKeeperFetcher.oracleKeeperUrl, "useTokenRecentPrices"], {
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
            minPrice: parseOraclePrice(priceItem.minPrice, tokenConfig.decimals, priceItem.oracleDecimals),
            maxPrice: parseOraclePrice(priceItem.maxPrice, tokenConfig.decimals, priceItem.oracleDecimals),
          };
        });

        const stableTokens = getV2Tokens(chainId).filter((token) => token.isStable);

        stableTokens.forEach((token) => {
          if (!result[token.address]) {
            result[token.address] = {
              minPrice: expandDecimals(1, USD_DECIMALS),
              maxPrice: expandDecimals(1, USD_DECIMALS),
            };
          }
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
  });

  return {
    pricesData: data?.pricesData,
    updatedAt: data?.updatedAt,
  };
}
