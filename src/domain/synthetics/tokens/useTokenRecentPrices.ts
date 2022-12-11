import { getTokenBySymbol } from "config/tokens";
import { jsonFetcher } from "lib/fetcher";
import { expandDecimals } from "lib/numbers";
import { TokenPrices } from "./types";
import useSWR from "swr";
import { useMemo } from "react";
import { getOracleKeeperUrl } from "config/oracleKeeper";

export type TokenPricesData = {
  [address: string]: TokenPrices;
};

type BackendResponse = {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: 6;
  tokenSymbol: string;
  tokenAddress: string;
  updatedAt: number;
}[];

export function useTokenRecentPrices(chainId: number): TokenPricesData {
  const url = getOracleKeeperUrl(chainId, "/prices/tickers");

  const { data } = useSWR<BackendResponse>(url, { fetcher: jsonFetcher });

  return useMemo(() => {
    return formatResponse(chainId, data);
  }, [data, chainId]);
}

function formatResponse(chainId: number, response: BackendResponse = []) {
  const result = response.reduce((acc, priceItem) => {
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
  }, {} as any);

  return result;
}

function parseOraclePrice(price: string, tokenDecimals: number, oracleDecimals: number) {
  return expandDecimals(price, tokenDecimals + oracleDecimals);
}
