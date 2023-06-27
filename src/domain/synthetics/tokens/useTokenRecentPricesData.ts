import { getOracleKeeperUrl } from "config/oracleKeeper";
import { getToken, getTokens, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { jsonFetcher } from "lib/fetcher";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import useSWR from "swr";
import { TokenPricesData } from "./types";
import { parseOraclePrice } from "./utils";

type BackendResponse = {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  updatedAt: number;
}[];

type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
};

export function useTokenRecentPrices(chainId: number): TokenPricesDataResult {
  const url = getOracleKeeperUrl(chainId, "/prices/tickers");

  const { data } = useSWR(url, {
    fetcher: (...args) =>
      jsonFetcher(...args).then((priceItems: BackendResponse) => {
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

        const stableTokens = getTokens(chainId).filter((token) => token.isStable);

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

        // // TODO: remove this after the oracle keeper is updated
        // if (result["0xEe01c0CD76354C383B8c7B4e65EA88D00B06f36f"] && !result[NATIVE_TOKEN_ADDRESS]) {
        //   result[NATIVE_TOKEN_ADDRESS] = result["0xEe01c0CD76354C383B8c7B4e65EA88D00B06f36f"];
        // }

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
