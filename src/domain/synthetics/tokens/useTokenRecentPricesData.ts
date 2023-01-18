import { getTokenBySymbol, getTokens, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { jsonFetcher } from "lib/fetcher";
import { expandDecimals } from "lib/numbers";
import useSWR from "swr";
import { useMemo } from "react";
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
  pricesData: TokenPricesData;
  isLoading: boolean;
};

export function useTokenRecentPricesData(chainId: number): TokenPricesDataResult {
  const url = getOracleKeeperUrl(chainId, "/prices/tickers");

  const { data, isValidating, error } = useSWR<BackendResponse>(url, { fetcher: jsonFetcher });

  return useMemo(() => {
    return {
      pricesData: data ? formatResponse(chainId, data) : {},
      isLoading: isValidating && !data && !error,
    };
  }, [chainId, data, isValidating, error]);
}

function formatResponse(chainId: number, response: BackendResponse = []): TokenPricesData {
  const result = response.reduce((acc: TokenPricesData, priceItem) => {
    let tokenConfig: any;

    try {
      tokenConfig = getTokenBySymbol(chainId, priceItem.tokenSymbol);
    } catch (e) {
      // ignore unknown token errors

      return acc;
    }

    acc[tokenConfig.address] = {
      minPrice: parseOraclePrice(priceItem.minPrice, tokenConfig.decimals, priceItem.oracleDecimals),
      maxPrice: parseOraclePrice(priceItem.maxPrice, tokenConfig.decimals, priceItem.oracleDecimals),
    };

    return acc;
  }, {} as TokenPricesData);

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
}
