import type { DayPriceCandle } from "lib/oracleKeeperFetcher/types";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

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

// Finds the token's 24h candle by symbol or normalized symbol (WBTC → BTC) and derives the change from it.
// Returns undefined without a candle or a positive open, so the UI never shows +Infinity% or NaN%.
export function getPriceDelta(
  candles: readonly DayPriceCandle[] | undefined,
  tokenSymbol: string
): PriceDelta | undefined {
  const normalizedSymbol = getNormalizedTokenSymbol(tokenSymbol);
  const candle = candles?.find((c) => c.tokenSymbol === tokenSymbol || c.tokenSymbol === normalizedSymbol);

  if (!candle || !(candle.open > 0)) {
    return undefined;
  }

  const deltaPrice = candle.close - candle.open;
  const deltaPercentage = (deltaPrice * 100) / candle.open;
  const deltaPercentageStr = deltaPercentage > 0 ? `+${deltaPercentage.toFixed(2)}%` : `${deltaPercentage.toFixed(2)}%`;

  return { ...candle, deltaPrice, deltaPercentage, deltaPercentageStr };
}
