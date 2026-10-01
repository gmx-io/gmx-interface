import type { Bar } from "charting_library";
import type { TradingViewResolution } from "config/tradingview";

export type SolanaChartCandles = {
  resolution: TradingViewResolution;
  bars: Bar[];
};

export function parseSolanaCandles(response: unknown): Bar[] {
  if (!response || typeof response !== "object" || !("candles" in response) || !Array.isArray(response.candles)) {
    throw new Error("Invalid candles response");
  }

  const bars = response.candles.map((candle: unknown): Bar => {
    if (!Array.isArray(candle) || candle.length < 5 || !candle.slice(0, 5).every(Number.isFinite)) {
      throw new Error("Invalid candle: expected timestamp, open, high, low, close");
    }

    const [time, open, high, low, close] = candle as number[];
    if (time <= 0 || low > Math.min(open, close) || high < Math.max(open, close) || low > high) {
      throw new Error("Invalid candle timestamp or OHLC prices");
    }

    return { time: time * 1000, open, high, low, close };
  });

  bars.sort((left, right) => left.time - right.time);
  if (bars.some((bar, index) => index > 0 && bar.time === bars[index - 1].time)) {
    throw new Error("Duplicate candle timestamp");
  }

  return bars;
}

export function selectSolanaBars(
  candles: SolanaChartCandles | undefined,
  resolution: string,
  to: number,
  countBack: number
): Bar[] {
  if (!candles || String(candles.resolution) !== resolution) return [];

  return candles.bars
    .filter((bar) => bar.time < to * 1000)
    .slice(-countBack)
    .map((bar) => ({ ...bar }));
}
