import { describe, expect, it } from "vitest";

import { getPriceDelta } from "./priceDelta";

const candle = (tokenSymbol: string, open: number, close: number) => ({ tokenSymbol, open, close, high: 0, low: 0 });

describe("getPriceDelta", () => {
  it("derives the 24h change from the token's candle", () => {
    const cases = [
      { name: "rise", candles: [candle("BTC", 100, 110)], symbol: "BTC", expected: "+10.00%" },
      { name: "fall", candles: [candle("ETH", 200, 190)], symbol: "ETH", expected: "-5.00%" },
      { name: "no change", candles: [candle("ETH", 200, 200)], symbol: "ETH", expected: "0.00%" },
      { name: "normalized symbol", candles: [candle("BTC", 100, 110)], symbol: "WBTC", expected: "+10.00%" },
      { name: "zero open", candles: [candle("BTC", 0, 110)], symbol: "BTC", expected: undefined },
      { name: "negative open", candles: [candle("BTC", -1, 110)], symbol: "BTC", expected: undefined },
      { name: "NaN open", candles: [candle("BTC", NaN, 110)], symbol: "BTC", expected: undefined },
      { name: "no candle", candles: [candle("ETH", 200, 190)], symbol: "BTC", expected: undefined },
      { name: "no data", candles: undefined, symbol: "BTC", expected: undefined },
    ];

    for (const { name, candles, symbol, expected } of cases) {
      expect({ name, delta: getPriceDelta(candles, symbol)?.deltaPercentageStr }).toEqual({ name, delta: expected });
    }
  });
});
