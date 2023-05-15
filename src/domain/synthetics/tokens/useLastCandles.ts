import useSWR from "swr";
import { fetchLastOracleCandles } from "./requests";

export function useLastCandles(chainId: number, tokenSymbol?: string, period?: string, limit = 1000) {
  const { data } = useSWR(tokenSymbol && period ? [chainId, "useLastCandles", tokenSymbol, period, limit] : null, {
    fetcher: () => fetchLastOracleCandles(chainId, tokenSymbol!, period!, limit),
  });

  return {
    candles: data,
  };
}
