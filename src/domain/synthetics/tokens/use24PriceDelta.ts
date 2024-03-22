import { useMemo } from "react";
import useSWR from "swr";
import { useOracleKeeperFetcher } from "./useOracleKeeperFetcher";

export function use24hPriceDelta(chainId: number, tokenSymbol?: string) {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data } = useSWR([chainId, oracleKeeperFetcher.url, "use24PriceDelta"], {
    fetcher: () => oracleKeeperFetcher.fetch24hPrices(),
  });

  const priceDelta = useMemo(() => {
    const tokenDelta = data?.find((candle) => candle.tokenSymbol === tokenSymbol);

    if (!tokenDelta) {
      return undefined;
    }

    const deltaPrice = tokenDelta.close - tokenDelta.open;
    const deltaPercentage = (deltaPrice * 100) / tokenDelta.open;
    const deltaPercentageStr =
      deltaPercentage > 0 ? `+${deltaPercentage.toFixed(2)}%` : `${deltaPercentage.toFixed(2)}%`;

    return {
      ...tokenDelta,
      deltaPrice,
      deltaPercentage,
      deltaPercentageStr,
    };
  }, [data, tokenSymbol]);

  return priceDelta;
}
