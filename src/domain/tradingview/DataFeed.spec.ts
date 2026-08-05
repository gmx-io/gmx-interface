import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OracleFetcher } from "lib/oracleKeeperFetcher/types";
import type { OhlcvCandle, Subscription } from "sdk/clients/v2";

vi.mock("lib/PauseableInterval", () => ({
  // Keep the poll inert so the test isolates the WS overlay.
  PauseableInterval: class {
    destroy = vi.fn();
    pause = vi.fn();
    resume = vi.fn();
  },
}));

import { DataFeed } from "./DataFeed";

const ARBITRUM = 42161;

function makeFactory() {
  let listener: ((candle: OhlcvCandle) => void) | undefined;
  const close = vi.fn();
  const factory = vi.fn(
    (_symbol: string, _timeframe: string): Subscription<OhlcvCandle> =>
      ({
        get: () => undefined,
        getMeta: () => undefined,
        status: "live",
        subscribe: (l: (candle: OhlcvCandle) => void) => {
          listener = l;
          return vi.fn();
        },
        subscribeStatus: () => vi.fn(),
        close,
      }) as unknown as Subscription<OhlcvCandle>
  );
  return { factory, emit: (candle: OhlcvCandle) => listener?.(candle), close };
}

const symbolInfo = (name: string) => ({ name, unit_id: "1" }) as any;

describe("DataFeed candle WS overlay", () => {
  let dataFeed: DataFeed;
  const oracleFetcher = { fetchOracleCandles: vi.fn().mockResolvedValue([]) } as unknown as OracleFetcher;

  beforeEach(() => {
    dataFeed = new DataFeed(ARBITRUM, oracleFetcher);
  });

  afterEach(() => {
    dataFeed.destroy();
    vi.clearAllMocks();
  });

  it("opens the candle channel for the bar's symbol/timeframe and feeds converted bars to onTick", () => {
    const { factory, emit } = makeFactory();
    dataFeed.setCandleStreamFactory(factory);
    const onTick = vi.fn();

    dataFeed.subscribeBars(symbolInfo("BTC"), "1" as any, onTick, "guid-1");

    expect(factory).toHaveBeenCalledWith("BTC", "1m");

    emit({ timestamp: 1_700_000_060_000, open: "4", high: "6", low: "3", close: "5" });

    // ohlcvCandleToBar -> formatTimeInBarToMs (time back to ms) -> multiplyBarValues(x1)
    expect(onTick).toHaveBeenCalledWith(
      expect.objectContaining({ time: 1_700_000_060_000, open: 4, high: 6, low: 3, close: 5 })
    );
  });

  it("does not open a candle stream for a stable token", () => {
    const { factory } = makeFactory();
    dataFeed.setCandleStreamFactory(factory);

    dataFeed.subscribeBars(symbolInfo("USDC"), "1" as any, vi.fn(), "guid-2");

    expect(factory).not.toHaveBeenCalled();
  });

  it("closes the candle stream on unsubscribeBars", () => {
    const { factory, close } = makeFactory();
    dataFeed.setCandleStreamFactory(factory);

    dataFeed.subscribeBars(symbolInfo("BTC"), "1" as any, vi.fn(), "guid-3");
    dataFeed.unsubscribeBars("guid-3");

    expect(close).toHaveBeenCalled();
  });

  it("opens no candle stream when no factory is set", () => {
    const onTick = vi.fn();
    expect(() => dataFeed.subscribeBars(symbolInfo("BTC"), "1" as any, onTick, "guid-4")).not.toThrow();
    dataFeed.unsubscribeBars("guid-4");
  });

  it("drops a stale (out-of-order) candle frame so the series never rewinds", () => {
    const { factory, emit } = makeFactory();
    dataFeed.setCandleStreamFactory(factory);
    const onTick = vi.fn();
    dataFeed.subscribeBars(symbolInfo("BTC"), "1" as any, onTick, "guid-5");

    emit({ timestamp: 1_700_000_120_000, open: "1", high: "1", low: "1", close: "2" });
    emit({ timestamp: 1_700_000_060_000, open: "1", high: "1", low: "1", close: "3" }); // older — stale

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(onTick).toHaveBeenCalledWith(expect.objectContaining({ time: 1_700_000_120_000 }));
  });

  it("still forwards an equal-time update of the current forming bar", () => {
    const { factory, emit } = makeFactory();
    dataFeed.setCandleStreamFactory(factory);
    const onTick = vi.fn();
    dataFeed.subscribeBars(symbolInfo("BTC"), "1" as any, onTick, "guid-6");

    emit({ timestamp: 1_700_000_060_000, open: "1", high: "2", low: "0", close: "5" });
    emit({ timestamp: 1_700_000_060_000, open: "1", high: "2", low: "0", close: "6" });

    expect(onTick).toHaveBeenCalledTimes(2);
    expect(onTick).toHaveBeenLastCalledWith(expect.objectContaining({ time: 1_700_000_060_000, close: 6 }));
  });

  it("closes the prior candle stream when the same listenerGuid re-subscribes", () => {
    const closes: Array<ReturnType<typeof vi.fn>> = [];
    const factory = vi.fn((_symbol: string, _timeframe: string): Subscription<OhlcvCandle> => {
      const close = vi.fn();
      closes.push(close);
      return {
        get: () => undefined,
        getMeta: () => undefined,
        status: "live",
        subscribe: () => vi.fn(),
        subscribeStatus: () => vi.fn(),
        close,
      } as unknown as Subscription<OhlcvCandle>;
    });
    dataFeed.setCandleStreamFactory(factory);

    dataFeed.subscribeBars(symbolInfo("BTC"), "1" as any, vi.fn(), "guid-7");
    dataFeed.subscribeBars(symbolInfo("BTC"), "1" as any, vi.fn(), "guid-7");

    expect(closes).toHaveLength(2);
    expect(closes[0]).toHaveBeenCalled();
  });
});
