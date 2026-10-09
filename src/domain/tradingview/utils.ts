import { CHART_PERIODS, type ChartPeriod } from "lib/legacy";
import type { OhlcvCandle } from "sdk/clients/v2";

import type { Bar } from "./types";

export function getObjectKeyFromValue<V extends string | number>(
  value: V,
  object: Record<string, V>
): string | undefined {
  return Object.keys(object).find((key) => object[key] === value);
}

export function formatTimeInBarToMs(bar: Bar) {
  return {
    ...bar,
    time: bar.time * 1000,
  };
}

/**
 * @unit seconds
 */
export function getCurrentCandleTime(period: ChartPeriod) {
  // Converts current time to seconds, rounds down to nearest period, adds timezone offset
  const periodSeconds = CHART_PERIODS[period];
  return Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds;
}

export function multiplyBarValues(bar: Bar, visualMultiplier: number | undefined): Bar {
  if (!visualMultiplier) return bar;

  return {
    ...bar,
    open: bar.open * visualMultiplier,
    close: bar.close * visualMultiplier,
    high: bar.high * visualMultiplier,
    low: bar.low * visualMultiplier,
  };
}

export function ohlcvCandleToBar(candle: OhlcvCandle): Bar {
  return {
    time: candle.timestamp / 1000,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

export function getSymbolName(symbolName: string, visualMultiplier = 1): string {
  return visualMultiplier ? `${visualMultiplier}@${symbolName}` : symbolName;
}

export function parseSymbolName(nameWithMultiplier: string): {
  visualMultiplier: number;
  symbolName: string;
} {
  if (nameWithMultiplier.includes("@")) {
    const [multiplier, symbol] = nameWithMultiplier.split("@");
    return {
      visualMultiplier: parseInt(multiplier),
      symbolName: symbol,
    };
  }

  return {
    visualMultiplier: 1,
    symbolName: nameWithMultiplier,
  };
}
