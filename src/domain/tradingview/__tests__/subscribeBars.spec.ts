import { ResolutionString } from "charting_library";
import { SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import {
  OracleFetcher,
  DayPriceCandle,
  RawIncentivesStats,
  TickersResponse,
} from "domain/synthetics/tokens/useOracleKeeperFetcher";
import { SyntheticsTVDataProvider } from "domain/synthetics/tradingview/SyntheticsTVDataProvider";
import { ethers } from "ethers";
import { noop } from "lodash";
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
        period: 0,
        rewardsPerMarket: {},
      },
      migration: {
        isActive: true,
        maxRebateBps: 0,
        period: 0,
      },
      trading: {
        isActive: true,
        rebatePercent: 0,
        allocation: "0",
        period: 0,
      },
    });
  }

  fetchPostReport(): Promise<Response> {
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
    let onRealtimeCallback: jest.Mock;
    let feedDataRef = { current: true };
    let intervalRef: { current: undefined | number } = { current: originalTimeoutId };
    let lastBarTimeRef = { current: 0 };
    let missingBarsInfoRef = { current: opts?.missingBarsInfoRef ?? { bars: [], isFetching: false } };
    let oracleKeeperFetcher = new MockOracleKeeperFetcher();
    let tvDataProvider = new SyntheticsTVDataProvider({
      resolutions: SUPPORTED_RESOLUTIONS_V2,
      oracleFetcher: oracleKeeperFetcher,
    });
    let tvDataProviderRef = { current: tvDataProvider };

    onRealtimeCallback = jest.fn();

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
    });

    return {
      originalTimeoutId,
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
    window.clearInterval(barsSubscriber.intervalRef.current);
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should should clear and set new intervalRef.current to a number", () => {
    const context = reset();

    // not equal to originalTimeoutId
    expect(context.intervalRef.current).not.toBe(context.originalTimeoutId);
    expect(typeof context.intervalRef.current).toBe("number");

    dispose(context);
  });

  it("should clear and not reset intervalRef.current if stable token", () => {
    const context = reset({
      symbolInfo: {
        ticker: "sETH",
        isStable: true,
      },
    });

    expect(context.intervalRef.current).toBeUndefined();

    dispose(context);
  });

  it("should call onRealtimeCallback after 500ms when missing data is present", async () => {
    jest.useFakeTimers();

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

    jest.advanceTimersByTime(500);

    expect(context.onRealtimeCallback).toHaveBeenCalled();

    dispose(context);
  });

  it("should call console.error when bars are out of ascending order", async () => {
    jest.useFakeTimers();

    // @ts-ignore
    // eslint-disable-next-line no-console
    console.error = jest.spyOn(console, "error").mockImplementation(noop);

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

    jest.advanceTimersByTime(500);

    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalledWith(
      "missingBarsInfoRef bars order is violating TradingView api schema. See https://www.tradingview.com/charting-library-docs/latest/connecting_data/Datafeed-API#subscribebars"
    );

    dispose(context);
    jest.restoreAllMocks();
  });

  it("should not call console.error when bars are in ascending order", async () => {
    jest.useFakeTimers();

    // @ts-ignore
    // eslint-disable-next-line no-console
    console.error = jest.spyOn(console, "error").mockImplementation(noop);

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

    jest.advanceTimersByTime(500);

    // eslint-disable-next-line no-console
    expect(console.error).not.toHaveBeenCalled();

    dispose(context);
    jest.restoreAllMocks();
  });
});
