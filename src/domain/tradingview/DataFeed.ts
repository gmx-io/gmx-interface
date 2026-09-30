import range from "lodash/range";

import {
  DatafeedErrorCallback,
  HistoryCallback,
  IBasicDataFeed,
  Mark,
  LibrarySymbolInfo,
  OnReadyCallback,
  PeriodParams,
  ResolutionString,
  ResolveCallback,
  SubscribeBarsCallback,
} from "charting_library";
import { type TradingViewResolution, RESOLUTION_TO_SECONDS, SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import { getChainlinkChartPricesFromGraph } from "domain/prices";
import { HIDDEN_CLOSE_DELAY_MS } from "domain/synthetics/tokens/wsPriceStreamStore";
import { Bar, FromOldToNewArray } from "domain/tradingview/types";
import {
  formatTimeInBarToMs,
  getCurrentCandleTime,
  multiplyBarValues,
  ohlcvCandleToBar,
  parseSymbolName,
} from "domain/tradingview/utils";
import { parseError } from "lib/errors";
import type { ChartPeriod } from "lib/legacy";
import {
  FreshnessMetricId,
  getRequestId,
  LoadingFailedEvent,
  LoadingStartEvent,
  LoadingSuccessEvent,
  metrics,
} from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { calculateDisplayDecimals } from "lib/numbers";
import { OracleFetcher } from "lib/oracleKeeperFetcher/types";
import { PauseableInterval } from "lib/PauseableInterval";
import { sleep } from "lib/sleep";
import type { OhlcvCandle, StreamCandlePeriod, Subscription } from "sdk/clients/v2";
import {
  getNativeToken,
  getTokenBySymbol,
  getTokenVisualMultiplier,
  isChartAvailableForToken,
} from "sdk/configs/tokens";

let metricsRequestId: string | undefined = undefined;
let metricsIsFirstLoadTime = true;
let metricsIsFirstDrawTime = true;

const V2_UPDATE_INTERVAL = 1000;

const PREFETCH_CANDLES_COUNT = 300;

const CANDLE_STREAM_ACTIVE_MS = 2000;

const STREAM_CANDLE_PERIODS: Partial<Record<TradingViewResolution, StreamCandlePeriod>> = {
  1: "1m",
  5: "5m",
  15: "15m",
  60: "1h",
  240: "4h",
  "1D": "1d",
};

type CandleStreamFactory = (symbol: string, timeframe: StreamCandlePeriod) => Subscription<OhlcvCandle> | undefined;

export class DataFeed extends EventTarget implements IBasicDataFeed {
  private subscriptions: Record<string, PauseableInterval<Bar | undefined>> = {};
  private candleStreams: Record<string, { open: () => void; close: () => void }> = {};
  private candleStreamFactory?: CandleStreamFactory;
  private isCandleStreamEnabled = false;
  private prefetchedBarsPromises: Record<string, Promise<FromOldToNewArray<Bar>>> = {};
  private visibilityHandler: () => void;
  private hiddenCloseTimer?: ReturnType<typeof setTimeout>;
  private marksGetter?: (
    symbolInfo: LibrarySymbolInfo,
    from: number,
    to: number,
    resolution: ResolutionString
  ) => Mark[] | Promise<Mark[]>;
  private tokenPriceGetter?: (symbol: string) => bigint | undefined;
  private pendingResolve?: () => void;

  declare addEventListener: (
    event: "candlesDisplay.success" | "currentCandle.update",
    callback: EventListenerOrEventListenerObject
  ) => void;
  declare removeEventListener: (
    event: "candlesDisplay.success" | "currentCandle.update",
    callback: EventListenerOrEventListenerObject
  ) => void;

  constructor(
    private chainId: number,
    private oracleFetcher: OracleFetcher
  ) {
    super();

    metrics.startTimer("candlesLoad");
    metrics.startTimer("candlesDisplay");

    this.visibilityHandler = () => {
      if (document.visibilityState === "hidden") {
        this.pauseAll();
      } else {
        this.resumeAll();
      }
    };

    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  searchSymbols(): void {
    // noop
  }

  setMarksGetter(
    getter: (
      symbolInfo: LibrarySymbolInfo,
      from: number,
      to: number,
      resolution: ResolutionString
    ) => Mark[] | Promise<Mark[]>
  ): void {
    this.marksGetter = getter;
  }

  setTokenPriceGetter(getter: (symbol: string) => bigint | undefined): void {
    this.tokenPriceGetter = getter;
  }

  setCandleStreamFactory(factory: CandleStreamFactory | undefined): void {
    this.candleStreamFactory = factory;
  }

  setCandleStreamEnabled(enabled: boolean): void {
    this.isCandleStreamEnabled = enabled;
    Object.values(this.candleStreams).forEach((stream) => (enabled ? stream.open() : stream.close()));
  }

  notifyPricesReady(): void {
    if (this.pendingResolve) {
      this.pendingResolve();
      this.pendingResolve = undefined;
    }
  }

  resolveSymbol(symbolNameWithMultiplier: string, onResolve: ResolveCallback): void {
    let { symbolName, visualMultiplier } = parseSymbolName(symbolNameWithMultiplier);

    if (!isChartAvailableForToken(this.chainId, symbolName)) {
      symbolName = getNativeToken(this.chainId).symbol;
      visualMultiplier = 1;
    }

    const token = getTokenBySymbol(this.chainId, symbolName);
    const prefix = visualMultiplier !== 1 ? getTokenVisualMultiplier(token) : "";

    const doResolve = () => {
      const currentPrice = this.tokenPriceGetter?.(symbolName);
      const priceDecimals = calculateDisplayDecimals(currentPrice, undefined, visualMultiplier);

      const symbolInfo: LibrarySymbolInfo = {
        unit_id: visualMultiplier.toString(),
        name: symbolName,
        type: "crypto",
        description: `${prefix}${symbolName}/USD`,
        ticker: symbolName,
        session: "24x7",
        minmov: 1,
        timezone: "Etc/UTC",
        has_intraday: true,
        has_daily: true,
        currency_code: "USD",
        data_status: "streaming",
        visible_plots_set: "ohlc",
        exchange: "GMX",
        listed_exchange: "GMX",
        format: "price",
        pricescale: 10 ** priceDecimals,
      };

      onResolve(symbolInfo);
    };

    const currentPrice = this.tokenPriceGetter?.(symbolName);

    if (currentPrice !== undefined) {
      setTimeout(doResolve, 0);
    } else {
      // Prices not loaded yet — defer until notifyPricesReady() is called
      this.pendingResolve = doResolve;
    }
  }

  async getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback
  ): Promise<void> {
    const to = periodParams.to;
    const res = resolution as TradingViewResolution;

    const isFirstDraw = metricsIsFirstDrawTime;
    metricsIsFirstDrawTime = false;

    const offset = Math.trunc(Math.max((Date.now() / 1000 - to) / RESOLUTION_TO_SECONDS[res], 0));
    // During a first data request we fetch regular amount of candles
    const countBack = periodParams.firstDataRequest
      ? periodParams.countBack
      : // But for subsequent requests we aggressively fetch more candles so that user can scroll back in time faster
        Math.max(periodParams.countBack * 2, 500);

    const token = getTokenBySymbol(this.chainId, symbolInfo.name);
    const isStable = token.isStable;

    let bars: FromOldToNewArray<Bar> = [];
    try {
      if (!isStable) {
        bars = await this.fetchCandles(symbolInfo.name, resolution, countBack + offset);
      } else {
        const currentCandleTime = getCurrentCandleTime(SUPPORTED_RESOLUTIONS_V2[res] as ChartPeriod);
        bars = this.getStableCandles(currentCandleTime, resolution, countBack + offset);
      }
    } catch (e) {
      onError(String(e));

      metrics.pushEvent<LoadingFailedEvent>({
        event: "candlesDisplay.failed",
        isError: true,
        time: metrics.getTime("candlesDisplay", true),
        data: {
          requestId: metricsRequestId!,
          isFirstTimeLoad: isFirstDraw,
        },
      });

      return;
    }

    const barsToReturn: FromOldToNewArray<Bar> = [];
    const visualMultiplier = parseInt(symbolInfo.unit_id ?? "1");

    for (const bar of bars) {
      if (bar.time <= to) {
        barsToReturn.push(multiplyBarValues(formatTimeInBarToMs(bar), visualMultiplier));
      } else {
        break;
      }
    }

    onResult(barsToReturn, { noData: offset + countBack >= 10_000 || barsToReturn.length < countBack });

    if (metricsIsFirstDrawTime) {
      metrics.pushEvent<LoadingSuccessEvent>({
        event: "candlesDisplay.success",
        isError: false,
        time: metrics.getTime("candlesDisplay", true),
        data: {
          requestId: metricsRequestId!,
          isFirstTimeLoad: isFirstDraw,
        },
      });
    }

    this.dispatchEvent(
      new CustomEvent("candlesDisplay.success", {
        detail: {
          requestId: metricsRequestId!,
          isFirstTimeLoad: isFirstDraw,
        },
      })
    );
  }

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    listenerGuid: string
  ): void {
    const token = getTokenBySymbol(this.chainId, symbolInfo.name);
    const isStable = token.isStable;

    const visualMultiplier = parseInt(symbolInfo.unit_id ?? "1");

    const res = resolution as TradingViewResolution;

    let chartBar: Bar | undefined;
    let lastStreamFrameAt = 0;
    const emit = (bar: Bar) => {
      chartBar = bar;
      onTick(multiplyBarValues(formatTimeInBarToMs(bar), visualMultiplier));
    };

    const interval = new PauseableInterval<Bar | undefined>(async ({ lastReturnedValue }) => {
      let candlesToFetch = 1;

      const currentCandleTime = getCurrentCandleTime(SUPPORTED_RESOLUTIONS_V2[res] as ChartPeriod);

      if (lastReturnedValue) {
        const periodSeconds = RESOLUTION_TO_SECONDS[res];

        const diff = Math.abs(currentCandleTime - lastReturnedValue.time);
        if (diff >= periodSeconds) {
          candlesToFetch = Math.ceil(diff / periodSeconds);
        }
      }

      let prices: FromOldToNewArray<Bar> = [];

      try {
        prices = !isStable
          ? await this.fetchCandles(symbolInfo.name, resolution, candlesToFetch)
          : this.getStableCandles(currentCandleTime, resolution, candlesToFetch);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        return lastReturnedValue;
      }

      let newLastReturnedValue: Bar | undefined = lastReturnedValue;

      let didPatchPreviousCandle = false;

      // while stream frames keep arriving they own the forming bar; rollovers and backfill stay with the poll
      const isStreamActive = Date.now() - lastStreamFrameAt < CANDLE_STREAM_ACTIVE_MS;

      for (const price of prices) {
        if (lastReturnedValue?.time && price.time < lastReturnedValue.time) {
          continue;
        }

        if (lastReturnedValue?.time && price.time > lastReturnedValue.time && !didPatchPreviousCandle) {
          didPatchPreviousCandle = true;
          const previousBar = chartBar ?? lastReturnedValue;
          const previousBarWithNewClose = {
            ...previousBar,
            close: price.open,
            low: Math.min(previousBar.low, price.open),
            high: Math.max(previousBar.high, price.open),
          };

          emit(previousBarWithNewClose);
        }

        if (!isStreamActive || price.time !== lastReturnedValue?.time) {
          emit(price);
        }

        newLastReturnedValue = price;
      }

      if (newLastReturnedValue) {
        this.dispatchEvent(
          new CustomEvent("currentCandle.update", {
            detail: {
              symbol: symbolInfo.name,
              resolution,
              bar: multiplyBarValues(formatTimeInBarToMs(newLastReturnedValue), visualMultiplier),
            },
          })
        );
      }

      return newLastReturnedValue;
    }, V2_UPDATE_INTERVAL);

    this.subscriptions[listenerGuid] = interval;
    this.candleStreams[listenerGuid]?.close();
    delete this.candleStreams[listenerGuid];

    const period = STREAM_CANDLE_PERIODS[res];
    if (isStable || !period) {
      return;
    }

    let subscription: Subscription<OhlcvCandle> | undefined;
    const stream = {
      open: () => {
        if (subscription || !this.isCandleStreamEnabled || document.visibilityState === "hidden") {
          return;
        }
        subscription = this.candleStreamFactory?.(symbolInfo.name, period);
        subscription?.subscribe((candle) => {
          lastStreamFrameAt = Date.now();
          const bar = ohlcvCandleToBar(candle);
          if (bar.time === chartBar?.time) {
            emit(bar);
          }
        });
      },
      close: () => {
        subscription?.close();
        subscription = undefined;
        lastStreamFrameAt = 0;
      },
    };
    this.candleStreams[listenerGuid] = stream;
    stream.open();
  }

  unsubscribeBars(listenerGuid: string): void {
    this.subscriptions[listenerGuid].destroy();
    delete this.subscriptions[listenerGuid];
    this.candleStreams[listenerGuid]?.close();
    delete this.candleStreams[listenerGuid];
  }

  onReady(callback: OnReadyCallback): void {
    if (metricsIsFirstLoadTime) {
      metricsRequestId = getRequestId();

      metrics.pushEvent<LoadingStartEvent>({
        event: "candlesDisplay.started",
        isError: false,
        time: metrics.getTime("candlesDisplay"),
        data: {
          requestId: metricsRequestId,
        },
      });
    }

    setTimeout(() => {
      callback({
        supported_resolutions: Object.keys(SUPPORTED_RESOLUTIONS_V2) as ResolutionString[],
        supports_marks: true,
        supports_timescale_marks: false,
        supports_time: true,
      });
    }, 0);
  }

  getMarks(
    symbolInfo: LibrarySymbolInfo,
    from: number,
    to: number,
    onDataCallback: (marks: Mark[]) => void,
    resolution: ResolutionString
  ): void {
    const result = this.marksGetter?.(symbolInfo, from, to, resolution) ?? [];
    if (result instanceof Promise) {
      result.then(onDataCallback, () => onDataCallback([]));
    } else {
      onDataCallback(result);
    }
  }

  prefetchBars(symbol: string, resolution: ResolutionString): void {
    const prefetchKey = `${symbol}-${resolution}`;
    if (prefetchKey in this.prefetchedBarsPromises) {
      return;
    }

    this.prefetchedBarsPromises[prefetchKey] = this.fetchCandles(symbol, resolution, PREFETCH_CANDLES_COUNT, true);
  }

  private pauseAll() {
    Object.values(this.subscriptions).forEach((subscription) => subscription.pause());
    clearTimeout(this.hiddenCloseTimer);
    // like the price stream, a quick tab switch keeps the socket
    this.hiddenCloseTimer = setTimeout(() => {
      Object.values(this.candleStreams).forEach((stream) => stream.close());
    }, HIDDEN_CLOSE_DELAY_MS);
  }

  private resumeAll() {
    clearTimeout(this.hiddenCloseTimer);
    this.hiddenCloseTimer = undefined;
    Object.values(this.subscriptions).forEach((subscription) => subscription.resume());
    Object.values(this.candleStreams).forEach((stream) => stream.open());
  }

  private async fetchCandles(
    symbol: string,
    resolution: ResolutionString,
    count: number,
    isPrefetch = false
  ): Promise<FromOldToNewArray<Bar>> {
    const prefetchKey = `${symbol}-${resolution}`;
    if (prefetchKey in this.prefetchedBarsPromises && !isPrefetch && metricsIsFirstLoadTime) {
      metricsIsFirstLoadTime = false;
      const promise = this.prefetchedBarsPromises[prefetchKey];
      delete this.prefetchedBarsPromises[prefetchKey];
      return await promise;
    }

    metricsRequestId = metricsRequestId ?? getRequestId();

    if (isPrefetch) {
      metrics.pushEvent<LoadingStartEvent>({
        event: "candlesLoad.started",
        isError: false,
        time: metrics.getTime("candlesLoad", true),
        data: {
          requestId: metricsRequestId,
          isFirstTimeLoad: isPrefetch,
        },
      });
    }

    metrics.startTimer("candlesLoad");

    count = Math.min(count, 10000);

    let success = true;
    let result: FromOldToNewArray<Bar> = [];

    const res = resolution as TradingViewResolution;

    result = await Promise.race([
      this.oracleFetcher
        .fetchOracleCandles(symbol, SUPPORTED_RESOLUTIONS_V2[res], count)
        .then((bars) => bars.slice().reverse()),
      sleep(5000).then(() => Promise.reject("Oracle candles timeout")),
    ])
      .catch((ex) => {
        // eslint-disable-next-line no-console
        console.warn(ex, "Switching to graph chainlink data");
        return Promise.race([
          getChainlinkChartPricesFromGraph(symbol, SUPPORTED_RESOLUTIONS_V2[res]),
          sleep(5000).then(() => Promise.reject("Chainlink candles timeout")),
        ]);
      })
      .catch((ex) => {
        success = false;
        onCandlesLoadFailed(ex, isPrefetch);
        // eslint-disable-next-line no-console
        console.warn("Load history candles failed", ex);
        return [];
      });

    if (success) {
      freshnessMetrics.reportThrottled(this.chainId, FreshnessMetricId.Candles);
      if (isPrefetch) {
        metrics.pushEvent<LoadingSuccessEvent>({
          event: "candlesLoad.success",
          isError: false,
          time: metrics.getTime("candlesLoad", true),
          data: {
            requestId: metricsRequestId!,
            isFirstTimeLoad: isPrefetch,
          },
        });
      }
    }

    return result;
  }

  private getStableCandles(to: number, resolution: ResolutionString, count: number) {
    const res = resolution as TradingViewResolution;
    const periodSeconds = RESOLUTION_TO_SECONDS[res];
    return range(count, 0, -1).map((i) => ({
      time: to - i * periodSeconds,
      open: 1,
      close: 1,
      high: 1,
      low: 1,
    }));
  }

  destroy() {
    clearTimeout(this.hiddenCloseTimer);
    Object.values(this.subscriptions).forEach((subscription) => subscription.destroy());
    Object.values(this.candleStreams).forEach((stream) => stream.close());
    this.candleStreams = {};
    document.removeEventListener("visibilitychange", this.visibilityHandler);
  }
}

function onCandlesLoadFailed(ex: any, isPrefetch: boolean) {
  const metricData = parseError(ex);

  metrics.pushEvent<LoadingFailedEvent>({
    event: "candlesLoad.failed",
    isError: true,
    time: metrics.getTime("candlesLoad", true),
    data: {
      requestId: metricsRequestId!,
      isFirstTimeLoad: isPrefetch,
      ...metricData,
    },
  });
}
