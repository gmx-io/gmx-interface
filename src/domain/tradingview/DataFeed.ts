import {
  DatafeedErrorCallback,
  HistoryCallback,
  IBasicDataFeed,
  LibrarySymbolInfo,
  OnReadyCallback,
  PeriodParams,
  ResolutionString,
  ResolveCallback,
  SubscribeBarsCallback,
} from "charting_library";
import range from "lodash/range";

import { getTvParamsCacheKey } from "config/localStorage";
import { getNativeToken, getTokenBySymbol, getTokenVisualMultiplier, isChartAvailableForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS_V1, SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import { getLimitChartPricesFromStats } from "domain/prices";
import { Bar, FromOldToNewArray, TvParamsCache } from "domain/tradingview/types";
import {
  formatTimeInBarToMs,
  getCurrentCandleTime,
  multiplyBarValues,
  parseSymbolName,
} from "domain/tradingview/utils";
import { PauseableInterval } from "lib/PauseableInterval";
import { LoadingFailedEvent, LoadingStartEvent, LoadingSuccessEvent, getRequestId, metrics } from "lib/metrics";
import { prepareErrorMetricData } from "lib/metrics/errorReporting";
import { OracleFetcher } from "lib/oracleKeeperFetcher/types";

const RESOLUTION_TO_SECONDS = {
  1: 60,
  5: 60 * 5,
  15: 60 * 15,
  60: 60 * 60,
  240: 60 * 60 * 4,
  "1D": 60 * 60 * 24,
  "1W": 60 * 60 * 24 * 7,
  "1M": 60 * 60 * 24 * 30,
};

let metricsRequestId: string | undefined = undefined;
let metricsIsFirstLoadTime = true;

const V1_UPDATE_INTERVAL = 1000;
const V2_UPDATE_INTERVAL = 1000;

export class DataFeed extends EventTarget implements IBasicDataFeed {
  private subscriptions: Record<string, PauseableInterval<Bar | undefined>> = {};
  private prefetchedBarsPromises: Record<string, Promise<FromOldToNewArray<Bar>>> = {};
  private visibilityHandler: () => void;
  private tickQueues: Record<string, Bar[]> = {};

  constructor(
    private chainId: number,
    private oracleFetcher: OracleFetcher,
    private tradePageVersion = 2
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
  resolveSymbol(symbolNameWithMultiplier: string, onResolve: ResolveCallback): void {
    let { symbolName, visualMultiplier } = parseSymbolName(symbolNameWithMultiplier);

    if (!isChartAvailableForToken(this.chainId, symbolName)) {
      symbolName = getNativeToken(this.chainId).symbol;
      visualMultiplier = 1;
    }

    const token = getTokenBySymbol(this.chainId, symbolName);
    const isStable = token.isStable;
    const prefix = visualMultiplier !== 1 ? getTokenVisualMultiplier(token) : "";

    const symbolInfo: LibrarySymbolInfo = {
      unit_id: visualMultiplier.toString(),
      name: symbolName,
      type: "crypto",
      description: `${prefix}${symbolName} / USD`,
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
      pricescale: isStable ? 10 : 0,
    };

    onResolve(symbolInfo);
  }

  async getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback
  ): Promise<void> {
    let isFirst = metricsIsFirstLoadTime;
    if (metricsIsFirstLoadTime) {
      metricsIsFirstLoadTime = false;

      metricsIsFirstLoadTime = !metricsRequestId;
      metricsRequestId = getRequestId();

      metrics.pushEvent<LoadingStartEvent>({
        event: "candlesLoad.started",
        isError: false,
        time: metrics.getTime("candlesLoad", true),
        data: {
          requestId: metricsRequestId,
          isFirstTimeLoad: metricsIsFirstLoadTime,
        },
      });

      metrics.startTimer("candlesLoad");
    }

    const to = periodParams.to;

    const offset = Math.trunc(Math.max((Date.now() / 1000 - to) / RESOLUTION_TO_SECONDS[resolution], 0));

    const token = getTokenBySymbol(this.chainId, symbolInfo.name);
    const isStable = token.isStable;

    let bars: FromOldToNewArray<Bar> = [];
    try {
      bars = !isStable
        ? await this.fetchCandles(
            symbolInfo.name,
            resolution,
            periodParams.countBack + offset,
            false,
            periodParams.firstDataRequest
          )
        : range(periodParams.countBack, 0, -1).map((i) => ({
            time:
              Math.trunc(to / RESOLUTION_TO_SECONDS[resolution]) * RESOLUTION_TO_SECONDS[resolution] -
              i * RESOLUTION_TO_SECONDS[resolution],
            open: 1,
            close: 1,
            high: 1,
            low: 1,
          }));
    } catch (e) {
      onError(String(e));

      const metricData = prepareErrorMetricData(e);

      metrics.pushEvent<LoadingFailedEvent>({
        event: "candlesLoad.failed",
        isError: true,
        time: metrics.getTime("candlesLoad", true),
        data: {
          requestId: metricsRequestId!,
          isFirstTimeLoad: isFirst,
          ...metricData,
        },
      });

      metrics.pushEvent<LoadingFailedEvent>({
        event: "candlesDisplay.failed",
        isError: true,
        time: metrics.getTime("candlesDisplay", true),
        data: {
          requestId: metricsRequestId!,
        },
      });

      return;
    }

    metrics.pushEvent<LoadingSuccessEvent>({
      event: "candlesLoad.success",
      isError: false,
      time: metrics.getTime("candlesLoad", true),
      data: {
        requestId: metricsRequestId!,
        isFirstTimeLoad: isFirst,
      },
    });

    const barsToReturn: FromOldToNewArray<Bar> = [];
    const visualMultiplier = parseInt(symbolInfo.unit_id ?? "1");

    for (const bar of bars) {
      if (bar.time <= to) {
        barsToReturn.push(multiplyBarValues(formatTimeInBarToMs(bar), visualMultiplier));
      } else {
        break;
      }
    }

    onResult(barsToReturn);

    this.dispatchEvent(
      new CustomEvent("candlesLoad.success", {
        detail: {
          requestId: metricsRequestId!,
          isFirstTimeLoad: isFirst,
        },
      })
    );

    this.saveTVParamsCache(this.chainId, { resolution, countBack: periodParams.countBack });
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

    const interval = new PauseableInterval<Bar | undefined>(
      async ({ lastReturnedValue }) => {
        let start = performance.now();
        let candlesToFetch = 1;

        const currentCandleTime = getCurrentCandleTime(SUPPORTED_RESOLUTIONS_V2[resolution]);

        if (lastReturnedValue) {
          const periodSeconds = RESOLUTION_TO_SECONDS[resolution];

          const diff = Math.abs(currentCandleTime - lastReturnedValue.time);
          if (diff >= periodSeconds) {
            candlesToFetch = Math.ceil(diff / periodSeconds);
          }

          console.log("diff", diff, "candles to fetch", candlesToFetch);
        }

        console.log("candles to fetch", candlesToFetch);

        let prices: FromOldToNewArray<Bar> = [];
        let fetchStart = performance.now();
        try {
          prices = !isStable
            ? await this.fetchCandles(symbolInfo.name, resolution, candlesToFetch)
            : range(candlesToFetch, 0, -1).map((i) => ({
                time: currentCandleTime - i * RESOLUTION_TO_SECONDS[resolution],
                open: 1,
                close: 1,
                high: 1,
                low: 1,
              }));
        } catch (e) {
          console.error("error fetching candles", e);
          return lastReturnedValue;
        }

        console.log("fetch time", performance.now() - fetchStart);

        console.log(
          "got len",
          prices.length,
          "with times",
          prices.map((p) => p.time).join(", "),
          "last time",
          lastReturnedValue?.time,
          getCurrentCandleTime(SUPPORTED_RESOLUTIONS_V2[resolution])
        );

        let newLastReturnedValue: Bar | undefined = lastReturnedValue;

        let didPatchPreviousCandle = false;

        for (const price of prices) {
          if (lastReturnedValue?.time && price.time < lastReturnedValue.time) {
            continue;
          }
          console.log("pre patch", lastReturnedValue?.time);

          if (lastReturnedValue?.time && price.time > lastReturnedValue.time && !didPatchPreviousCandle) {
            didPatchPreviousCandle = true;
            const previousBarWithNewClose = { ...lastReturnedValue, close: price.open };
            console.log(
              "patching previous candle",
              previousBarWithNewClose,
              "with time",
              previousBarWithNewClose.time,
              multiplyBarValues(formatTimeInBarToMs(previousBarWithNewClose), visualMultiplier)
            );

            await Promise.resolve().then(() => {
              console.log("[] patch");

              onTick(multiplyBarValues(formatTimeInBarToMs(previousBarWithNewClose), visualMultiplier));
            });
          }

          const bar = multiplyBarValues(formatTimeInBarToMs(price), visualMultiplier);

          await Promise.resolve().then(() => {
            console.log("[] tick", bar);
            onTick(bar);
          });

          newLastReturnedValue = price;
        }

        console.log("time", performance.now() - start);
        return newLastReturnedValue;
      },
      this.tradePageVersion === 1 ? V1_UPDATE_INTERVAL : V2_UPDATE_INTERVAL
    );

    this.subscriptions[listenerGuid] = interval;
  }

  unsubscribeBars(listenerGuid: string): void {
    this.subscriptions[listenerGuid].destroy();
    delete this.subscriptions[listenerGuid];
  }

  onReady(callback: OnReadyCallback): void {
    callback({
      supported_resolutions: Object.keys(
        this.tradePageVersion === 1 ? SUPPORTED_RESOLUTIONS_V1 : SUPPORTED_RESOLUTIONS_V2
      ) as ResolutionString[],
      supports_marks: false,
      supports_timescale_marks: false,
      supports_time: true,
      // @ts-ignore
      reset_cache_timeout: 100,
    });
  }

  prefetchBars(symbol: string): void {
    if (symbol in this.prefetchedBarsPromises) {
      return;
    }

    const tvParams = this.getInitialTVParamsFromCache(this.chainId);

    if (!tvParams) {
      return;
    }

    this.prefetchedBarsPromises[symbol] = this.fetchCandles(symbol, tvParams.resolution, tvParams.countBack, true);
  }

  private getInitialTVParamsFromCache(chainId: number) {
    const tvCache = localStorage.getItem(getTvParamsCacheKey(chainId, this.tradePageVersion === 1));

    if (!tvCache) {
      return undefined;
    }

    const { countBack, resolution }: TvParamsCache = JSON.parse(tvCache);
    const period = SUPPORTED_RESOLUTIONS_V2[resolution];

    if (!period) {
      return undefined;
    }

    return {
      countBack,
      resolution,
    };
  }

  private saveTVParamsCache(chainId: number, { resolution, countBack }: TvParamsCache) {
    localStorage.setItem(
      getTvParamsCacheKey(chainId, this.tradePageVersion === 1),
      JSON.stringify({ resolution, countBack })
    );
  }

  private pauseAll() {
    console.log("pausing all");
    Object.values(this.subscriptions).forEach((subscription) => subscription.pause());
  }

  private resumeAll() {
    console.log("resuming all");
    Object.values(this.subscriptions).forEach((subscription) => subscription.resume());
  }

  private async fetchCandles(
    symbol: string,
    resolution: ResolutionString,
    count: number,
    isPrefetch = false,
    isFirstFetch = false
  ): Promise<FromOldToNewArray<Bar>> {
    if (symbol in this.prefetchedBarsPromises && !isPrefetch && isFirstFetch) {
      const promise = this.prefetchedBarsPromises[symbol];
      delete this.prefetchedBarsPromises[symbol];
      return await promise;
    }

    if (this.tradePageVersion === 1) {
      return await getLimitChartPricesFromStats(this.chainId, symbol, SUPPORTED_RESOLUTIONS_V1[resolution], count);
    }

    return (
      await this.oracleFetcher.fetchOracleCandles(symbol, SUPPORTED_RESOLUTIONS_V2[resolution], count)
    ).toReversed();
  }

  private queueTick(listenerGuid: string, onTick: SubscribeBarsCallback, bar: Bar) {
    if (!(listenerGuid in this.tickQueues)) {
      this.tickQueues[listenerGuid] = [];
    }

    this.tickQueues[listenerGuid].push(bar);
  }

  destroy() {
    console.log("destroying datafeed");
    Object.values(this.subscriptions).forEach((subscription) => subscription.destroy());
    document.removeEventListener("visibilitychange", this.visibilityHandler);
  }
}