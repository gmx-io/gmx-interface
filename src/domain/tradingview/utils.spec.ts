import { describe, expect, it } from "vitest";

import { CHART_PERIODS } from "lib/legacy";

import { getCurrentCandleTime, ohlcvCandleToBar } from "./utils";

describe("ohlcvCandleToBar", () => {
  it("converts a ms-timestamp, stringified-OHLC candle to a seconds-time numeric Bar", () => {
    expect(
      ohlcvCandleToBar({ timestamp: 1_700_000_060_000, open: "4.5", high: "6", low: "3.25", close: "5" })
    ).toEqual({ time: 1_700_000_060, open: 4.5, high: 6, low: 3.25, close: 5 });
  });

  it("keeps time in seconds so formatTimeInBarToMs round-trips back to the original ms", () => {
    const ms = 1_700_000_120_000;
    const bar = ohlcvCandleToBar({ timestamp: ms, open: "1", high: "1", low: "1", close: "1" });
    expect(bar.time * 1000).toBe(ms);
  });

  it("parses decimal price strings to numbers", () => {
    const bar = ohlcvCandleToBar({
      timestamp: 1000,
      open: "65000.5",
      high: "65100.25",
      low: "64900.1",
      close: "65050.75",
    });
    expect(bar).toMatchObject({ open: 65000.5, high: 65100.25, low: 64900.1, close: 65050.75 });
  });
});

describe("getCurrentCandleTime", () => {
  it.each(["1m", "1h", "1d", "1w", "1M"] as const)(
    "returns a finite, period-aligned time for %s (1w/1M previously NaN)",
    (period) => {
      const t = getCurrentCandleTime(period);
      expect(Number.isFinite(t)).toBe(true);
      expect(t % CHART_PERIODS[period]).toBe(0);
    }
  );
});
