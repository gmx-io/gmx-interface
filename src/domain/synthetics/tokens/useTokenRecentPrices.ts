import { getTokenBySymbol } from "config/tokens";
import { jsonFetcher } from "lib/http";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { getOracleKeeperEndpoint } from "lib/oracleKeeper";
import { TokenPricesData, TokenPricesMap } from "./types";
import useSWR from "swr";
import { useMemo } from "react";

type BackendResponse = {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: 6;
  tokenSymbol: string;
  updatedAt: number;
}[];

export function useTokenRecentPrices(chainId: number): TokenPricesData {
  const url = getOracleKeeperEndpoint(chainId, "/prices/tickers");

  const { data } = useSWR<BackendResponse>([url], { fetcher: jsonFetcher });

  return useMemo(() => {
    return {
      tokenPrices: formatResponse(chainId, data),
    };
  }, [data, chainId]);
}

function formatResponse(chainId: number, response: BackendResponse = []) {
  const result = response.reduce((acc, priceItem) => {
    const tokenConfig = getTokenBySymbol(chainId, priceItem.tokenSymbol);

    if (!tokenConfig) {
      return acc;
    }

    acc[tokenConfig.address] = {
      minPrice: parseOraclePrice(priceItem.minPrice, priceItem.oracleDecimals),
      maxPrice: parseOraclePrice(priceItem.maxPrice, priceItem.oracleDecimals),
    };

    return acc;
  }, {} as TokenPricesMap);

  return result;
}

function parseOraclePrice(price: string, oracleDecimals: number) {
  return expandDecimals(price, USD_DECIMALS - oracleDecimals);
}
