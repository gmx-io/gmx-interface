import { ResolutionString } from "charting_library";
import { SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import { DayPriceCandle, OracleFetcher, RawIncentivesStats, TickersResponse } from "lib/oracleKeeperFetcher";
import { SyntheticsTVDataProvider } from "domain/synthetics/tradingview/SyntheticsTVDataProvider";
import { ethers } from "ethers";
import noop from "lodash/noop";
import { afterEach, describe, expect, it, Mock, vi } from "vitest";
import type { Bar, FromNewToOldArray, FromOldToNewArray } from "../types";
import { subscribeBars } from "../useTVDatafeed";

class MockOracleKeeperFetcher implements OracleFetcher {
  url: string;

  constructor() {
    this.url = "some-url";
  }

  fetchTickers(): Promise<TickersResponse> {
    return Promise.resolve([
      {
        minPrice: "0",
        maxPrice: "1",
        oracleDecimals: 30,
        tokenSymbol: "ETH",
        tokenAddress: ethers.ZeroAddress,
        updatedAt: 1700000000,
      },
    ]);
  }
  fetch24hPrices(): Promise<DayPriceCandle[]> {
    return Promise.resolve([{ tokenSymbol: "ETH", high: 1, low: -1, open: 0, close: 0 }]);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetchOracleCandles(_tokenSymbol: string, _period: string, _limit: number): Promise<FromNewToOldArray<Bar>> {
    return Promise.resolve([
      {
        time: 1700000000,
        open: 0,
        high: 1,
        low: -1,
        close: 0,
      },
    ]);
  }
  fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
    return Promise.resolve({
      lp: {
        isActive: true,
        totalRewards: "0",
        token: "0x912CE59144191C1204E64559FE8253a0e49E6548",
        period: 0,
        rewardsPerMarket: {},
        excludeHolders: [],
      },
      migration: {
        isActive: true,
        maxRebateBps: 0,
        period: 0,
      },
      trading: {
        isActive: true,
        rebatePercent: 0,
        estimatedRebatePercent: 0,
        maxRebatePercent: 0,
        token: "0x912CE59144191C1204E64559FE8253a0e49E6548",
        allocation: "0",
        period: 0,
      },
    } satisfies RawIncentivesStats);
  }

  fetchPostFeedback(): Promise<Response> {
    return Promise.resolve(new Response());
  }

  fetchPostEvent(): Promise<Response> {
    return Promise.resolve(new Response());
  }

  fetchPostCounter(): Promise<Response> {
    return Promise.resolve(new Response());
  }

  fetchPostTiming(): Promise<Response> {
    return Promise.resolve(new Response());
  }

  fetchPostBatchReport(): Promise<Response> {
    return Promise.resolve(new Response());
  }
}

describe("subscribeBars", () => {
  function reset(opts?: {
    symbolInfo?: {
      ticker: string;
      isStable: boolean;
    };
    missingBarsInfoRef?: {
      bars: FromOldToNewArray<Bar>;
      isFetching: boolean;
    };
  }) {
    const chainId = 421614;
    const originalTimeoutId = window.setTimeout(noop, 1000);
    const originalTimeoutGuid = "ETH_#_USD_#_5";

    let onRealtimeCallback: Mock;
    let feedDataRef = { current: true };
    let intervalRef: { current: Record<string, number> | undefined } = {
      current: { [originalTimeoutGuid]: originalTimeoutId },
    };
    let lastBarTimeRef = { current: 0 };
    let missingBarsInfoRef = { current: opts?.missingBarsInfoRef ?? { bars: [], isFetching: false } };
    let oracleKeeperFetcher = new MockOracleKeeperFetcher();
    let tvDataProvider = new SyntheticsTVDataProvider({
      resolutions: SUPPORTED_RESOLUTIONS_V2,
      oracleFetcher: oracleKeeperFetcher,
      chainId,
    });
    let tvDataProviderRef = { current: tvDataProvider };

    onRealtimeCallback = vi.fn();

    subscribeBars({
      chainId,
      feedDataRef,
      intervalRef,
      lastBarTimeRef,
      missingBarsInfoRef,
      onRealtimeCallback,
      resolution: "1m" as ResolutionString,
      supportedResolutions: SUPPORTED_RESOLUTIONS_V2,
      symbolInfo: opts?.symbolInfo ?? {
        ticker: "ETH",
        isStable: false,
      },
      tvDataProviderRef,
      listenerGuid: originalTimeoutGuid,
    });

    return {
      originalTimeoutId,
      originalTimeoutGuid,
      feedDataRef,
      intervalRef,
      lastBarTimeRef,
      missingBarsInfoRef,
      oracleKeeperFetcher,
      tvDataProvider,
      tvDataProviderRef,
      onRealtimeCallback,
    };
  }

  function dispose(barsSubscriber: ReturnType<typeof reset>) {
    window.clearInterval(barsSubscriber.intervalRef.current?.[barsSubscriber.originalTimeoutGuid]);
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should clear and set new intervalRef.current not to be undefined", () => {
    const context = reset();

    // not equal to originalTimeoutId
    expect(context.originalTimeoutId).not.toBe(context.intervalRef.current?.[context.originalTimeoutGuid]);
    expect(typeof context.intervalRef.current?.[context.originalTimeoutGuid]).not.toBe(undefined);

    dispose(context);
  });

  it("should clear and not reset intervalRef.current if stable token", () => {
    const context = reset({
      symbolInfo: {
        ticker: "sETH",
        isStable: true,
      },
    });

    expect(context.intervalRef.current?.[context.originalTimeoutGuid]).toBeUndefined();

    dispose(context);
  });

  it("should call onRealtimeCallback after 500ms when missing data is present", async () => {
    vi.useFakeTimers();

    const context = reset({
      missingBarsInfoRef: {
        bars: [
          {
            time: 1700000000,
            open: 0,
            high: 1,
            low: -1,
            close: 0,
          },
        ],
        isFetching: false,
      },
    });

    vi.advanceTimersByTime(500);

    expect(context.onRealtimeCallback).toHaveBeenCalled();

    dispose(context);
  });

  it("should call console.error when bars are out of ascending order", async () => {
    vi.useFakeTimers();

    // @ts-ignore
    // eslint-disable-next-line no-console
    console.error = vi.spyOn(console, "error").mockImplementation(noop);

    const context = reset({
      missingBarsInfoRef: {
        bars: [
          {
            time: 1700000000,
            open: 0,
            high: 1,
            low: -1,
            close: 0,
          },
          {
            time: 1699999999,
            open: 0,
            high: 1,
            low: -1,
            close: 0,
          },
        ],
        isFetching: false,
      },
    });

    vi.advanceTimersByTime(500);

    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalledWith(
      "missingBarsInfoRef bars order is violating TradingView api schema. See https://www.tradingview.com/charting-library-docs/latest/connecting_data/Datafeed-API#subscribebars"
    );

    dispose(context);
    vi.restoreAllMocks();
  });

  it("should not call console.error when bars are in ascending order", async () => {
    vi.useFakeTimers();

    // @ts-ignore
    // eslint-disable-next-line no-console
    console.error = vi.spyOn(console, "error").mockImplementation(noop);

    const context = reset({
      missingBarsInfoRef: {
        bars: [
          {
            time: 1699999999,
            open: 0,
            high: 1,
            low: -1,
            close: 0,
          },
          {
            time: 1700000000,
            open: 0,
            high: 1,
            low: -1,
            close: 0,
          },
        ],
        isFetching: false,
      },
    });

    vi.advanceTimersByTime(500);

    // eslint-disable-next-line no-console
    expect(console.error).not.toHaveBeenCalled();

    dispose(context);
    vi.restoreAllMocks();
  });
});
