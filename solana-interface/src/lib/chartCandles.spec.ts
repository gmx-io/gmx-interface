import { describe, expect, it } from "vitest";

import { parseSolanaCandles, selectSolanaBars, type SolanaChartCandles } from "./chartCandles";

describe("parseSolanaCandles", () => {
  it("converts seconds to milliseconds and sorts newest-first API candles", () => {
    expect(
      parseSolanaCandles({
        candles: [
          [600, 150, 155, 149, 154],
          [300, 148, 151, 147, 150],
        ],
      })
    ).toEqual([
      { time: 300000, open: 148, high: 151, low: 147, close: 150 },
      { time: 600000, open: 150, high: 155, low: 149, close: 154 },
    ]);
  });

  it("accepts an empty history", () => {
    expect(parseSolanaCandles({ candles: [] })).toEqual([]);
  });

  it.each([
    {},
    { candles: [[300, "150", 155, 149, 154]] },
    { candles: [[300, 150, 155, 149, NaN]] },
    { candles: [[300, 150, 145, 149, 154]] },
    { candles: [[300, 150, 155, 149]] },
  ])("rejects malformed responses instead of drawing invalid prices: %j", (response) => {
    expect(() => parseSolanaCandles(response)).toThrow();
  });

  it("rejects duplicate timestamps", () => {
    expect(() =>
      parseSolanaCandles({
        candles: [
          [300, 1, 1, 1, 1],
          [300, 1, 1, 1, 1],
        ],
      })
    ).toThrow("Duplicate candle timestamp");
  });
});

describe("selectSolanaBars", () => {
  const candles: SolanaChartCandles = {
    resolution: 5,
    bars: parseSolanaCandles({
      candles: [
        [300, 1, 1, 1, 1],
        [600, 2, 2, 2, 2],
        [900, 3, 3, 3, 3],
      ],
    }),
  };

  it("does not show a response fetched for another resolution", () => {
    expect(selectSolanaBars(candles, "60", 1200, 10)).toEqual([]);
    expect(selectSolanaBars(undefined, "5", 1200, 10)).toEqual([]);
  });

  it("excludes the to boundary and supplies the requested count of earlier bars", () => {
    expect(selectSolanaBars(candles, "5", 900, 1)).toEqual([candles.bars[1]]);
  });

  it("protects stored candles from TradingView mutations", () => {
    const bars = selectSolanaBars(candles, "5", 900, 1);
    bars[0].close = 999;
    expect(candles.bars[1].close).toBe(2);
  });
});
