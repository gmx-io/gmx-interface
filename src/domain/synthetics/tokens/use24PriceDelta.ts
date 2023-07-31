import useSWR from "swr";
import { getOracleKeeperUrl } from "config/oracleKeeper";
import { useMemo } from "react";

export type DayPriceCandle = {
  tokenSymbol: string;
  high: number;
  low: number;
  open: number;
  close: number;
};

export function use24hPriceDelta(chainId: number, tokenSymbol?: string) {
  const { data } = useSWR<DayPriceCandle[]>(getOracleKeeperUrl(chainId, "/prices/24h"));

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
