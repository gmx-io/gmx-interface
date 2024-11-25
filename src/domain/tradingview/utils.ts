import { CHART_PERIODS } from "lib/legacy";
import type { Bar } from "./types";

export function getObjectKeyFromValue(value, object) {
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
export function getCurrentCandleTime(period: string) {
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
