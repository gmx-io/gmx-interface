import { useMemo } from "react";
import useSWR from "swr";
import { fetch24hPrices } from "./oracleKeeperRequests";

export function use24hPriceDelta(chainId: number, tokenSymbol?: string) {
  const { data } = useSWR([chainId, "use24hPriceDelta"], { fetcher: (chainId) => fetch24hPrices(chainId) });

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
