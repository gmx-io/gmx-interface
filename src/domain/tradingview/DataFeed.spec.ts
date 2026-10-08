import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LibrarySymbolInfo, ResolutionString } from "charting_library";
import { ARBITRUM } from "config/chains";
import type { OracleFetcher } from "lib/oracleKeeperFetcher/types";
import type { OhlcvCandle, Subscription } from "sdk/clients/v2";

import { DataFeed } from "./DataFeed";
import type { Bar } from "./types";

const T0 = 1_700_000_040;

const bar = (minute: number, close: number, high = close): Bar => ({
  time: T0 + minute * 60,
  open: close,
  high,
  low: close,
  close,
});

const toCandle = ({ time, open, high, low, close }: Bar): OhlcvCandle => ({
  timestamp: time * 1000,
  open: String(open),
  high: String(high),
  low: String(low),
  close: String(close),
});

type Step = { at: number; keeper?: Bar[]; frame?: Bar };

describe("DataFeed candle stream and poll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each<{ name: string; start: number; keeper: Bar[]; steps: Step[]; end: number; expected: number[][] }>([
    {
      name: "a rollover patches the bar the stream moved and drops the new-bar frame that beat the poll",
      start: 58_500,
      keeper: [bar(0, 100, 101)],
      steps: [
        { at: 58_700, frame: bar(0, 103, 104) },
        { at: 60_000, keeper: [bar(0, 100, 101), bar(1, 103.2)] },
        { at: 60_200, frame: bar(1, 103.5) },
        { at: 60_700, frame: bar(1, 103.6) },
      ],
      end: 60_800,
      expected: [
        [0, 100, 101],
        [0, 103, 104],
        [0, 103.2, 104],
        [1, 103.2, 103.2],
        [1, 103.6, 103.6],
      ],
    },
    {
      name: "a frame for the closed bar does not stop the poll from updating the new bar",
      start: 58_500,
      keeper: [bar(0, 100)],
      steps: [
        { at: 60_000, keeper: [bar(0, 100), bar(1, 101)] },
        { at: 60_600, frame: bar(0, 100.5) },
        { at: 60_900, keeper: [bar(0, 100), bar(1, 102)] },
        { at: 61_400, frame: bar(0, 100.6) },
        { at: 61_900, keeper: [bar(0, 100), bar(1, 103)] },
      ],
      end: 62_600,
      expected: [
        [0, 100, 100],
        [0, 100, 100],
        [0, 101, 101],
        [1, 101, 101],
        [1, 102, 102],
        [1, 103, 103],
      ],
    },
    {
      name: "the poll backfills a gap after both sources were down although the stream came back first",
      start: 30_000,
      keeper: [bar(0, 100)],
      steps: [
        { at: 30_500, keeper: [] },
        { at: 330_200, frame: bar(5, 110) },
        { at: 330_300, keeper: [0, 1, 2, 3, 4, 5].map((minute) => bar(minute, 100 + minute)) },
      ],
      end: 331_100,
      expected: [
        [0, 100, 100],
        [0, 101, 101],
        [1, 101, 101],
        [2, 102, 102],
        [3, 103, 103],
        [4, 104, 104],
        [5, 105, 105],
      ],
    },
    {
      name: "an older same-bar frame never alternates with the poll, which takes the bar back once frames stop",
      start: 10_000,
      keeper: [bar(0, 100)],
      steps: [
        { at: 10_200, frame: bar(0, 101) },
        { at: 10_500, keeper: [bar(0, 105, 106)] },
        { at: 11_200, frame: bar(0, 102) },
      ],
      end: 14_100,
      expected: [
        [0, 100, 100],
        [0, 101, 101],
        [0, 102, 102],
        [0, 105, 106],
      ],
    },
  ])("$name", async ({ start, keeper: initialKeeper, steps, end, expected }) => {
    vi.setSystemTime(T0 * 1000 + start);
    let keeper = initialKeeper;
    let pushFrame: ((candle: OhlcvCandle) => void) | undefined;
    const subscription: Subscription<OhlcvCandle> = {
      get: () => undefined,
      getMeta: () => undefined,
      subscribe: (listener) => {
        pushFrame = listener;
        return () => undefined;
      },
      subscribeStatus: () => () => undefined,
      subscribeError: () => () => undefined,
      status: "live",
      close: () => undefined,
    };
    const oracleFetcher = {
      fetchOracleCandles: async (_symbol: string, _period: string, limit: number) => keeper.slice(-limit).reverse(),
    } as unknown as OracleFetcher;

    const dataFeed = new DataFeed(ARBITRUM, oracleFetcher);
    dataFeed.setCandleStreamFactory(() => subscription);
    dataFeed.setCandleStreamEnabled(true);
    const ticks: Bar[] = [];
    const symbolInfo = { name: "BTC", unit_id: "1" } as LibrarySymbolInfo;
    dataFeed.subscribeBars(symbolInfo, "1" as ResolutionString, (tick) => ticks.push(tick), "guid");

    for (const { at, keeper: nextKeeper, frame } of steps) {
      await vi.advanceTimersByTimeAsync(T0 * 1000 + at - Date.now());
      keeper = nextKeeper ?? keeper;
      if (frame) {
        pushFrame?.(toCandle(frame));
      }
    }
    await vi.advanceTimersByTimeAsync(T0 * 1000 + end - Date.now());
    dataFeed.destroy();

    expect(ticks.map(({ time, close, high }) => [(time / 1000 - T0) / 60, close, high])).toEqual(expected);
  });
});
