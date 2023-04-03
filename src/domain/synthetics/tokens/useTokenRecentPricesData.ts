import useSWR from "swr";
import { getTokenBySymbol, getTokens, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { jsonFetcher } from "lib/fetcher";
import { expandDecimals } from "lib/numbers";
import { getOracleKeeperUrl } from "config/oracleKeeper";
import { USD_DECIMALS } from "lib/legacy";
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
};

export function useTokenRecentPrices(chainId: number): TokenPricesDataResult {
  const url = getOracleKeeperUrl(chainId, "/prices/tickers");

  const { data } = useSWR<TokenPricesData>(url, {
    fetcher: (...args) =>
      jsonFetcher(...args).then((priceItems: BackendResponse) => {
        const result: TokenPricesData = {};

        priceItems.forEach((priceItem) => {
          let tokenConfig: any;

          try {
            tokenConfig = getTokenBySymbol(chainId, priceItem.tokenSymbol);
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

        if (!result[wrappedToken.address] && result[NATIVE_TOKEN_ADDRESS]) {
          result[wrappedToken.address] = result[NATIVE_TOKEN_ADDRESS];
        }

        return result;
      }),
  });

  return {
    pricesData: data,
  };
}
