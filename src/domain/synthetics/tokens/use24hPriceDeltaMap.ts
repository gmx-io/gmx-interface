import { useMemo } from "react";
import useSWR from "swr";
import { Address } from "viem";

import { getToken } from "config/tokens";

import { useOracleKeeperFetcher } from "../../../lib/oracleKeeperFetcher/useOracleKeeperFetcher";

export type PriceDelta = {
  close: number;
  deltaPercentage: number;
  deltaPercentageStr: string;
  deltaPrice: number;
  high: number;
  low: number;
  open: number;
  tokenSymbol: string;
};

export type PriceDeltaMap = Partial<Record<Address, PriceDelta>>;

export function use24hPriceDeltaMap(
  chainId: number,
  tokenAddresses: (Address | undefined)[]
): PriceDeltaMap | undefined {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data } = useSWR<
    {
      close: number;
      high: number;
      low: number;
      open: number;
      tokenSymbol: string;
    }[]
  >([chainId, oracleKeeperFetcher.url, "use24PriceDelta"], {
    fetcher: () => oracleKeeperFetcher.fetch24hPrices(),
  });

  const priceDeltas = useMemo(() => {
    return Object.fromEntries(
      tokenAddresses
        .filter((tokenAddress): tokenAddress is Address => Boolean(tokenAddress))
        .map((tokenAddress) => {
          const token = getToken(chainId, tokenAddress);

          const tokenDelta = data?.find((candle) => candle.tokenSymbol === token.symbol);

          if (!tokenDelta) {
            return [tokenAddress, undefined];
          }

          const deltaPrice = tokenDelta.close - tokenDelta.open;
          const deltaPercentage = (deltaPrice * 100) / tokenDelta.open;
          const deltaPercentageStr =
            deltaPercentage > 0 ? `+${deltaPercentage.toFixed(2)}%` : `${deltaPercentage.toFixed(2)}%`;

          return [tokenAddress, { ...tokenDelta, deltaPrice, deltaPercentage, deltaPercentageStr }];
        })
    );
  }, [chainId, data, tokenAddresses]);

  return priceDeltas;
}
