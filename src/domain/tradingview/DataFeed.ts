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
import {
  getNativeToken,
  getTokenBySymbol,
  getTokenVisualMultiplier,
  isChartAvailableForToken,
} from "sdk/configs/tokens";
import { SUPPORTED_RESOLUTIONS_V1, SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import { getChainlinkChartPricesFromGraph, getLimitChartPricesFromStats } from "domain/prices";
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
import { sleep } from "lib/sleep";

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

  declare addEventListener: (event: "candlesLoad.success", callback: EventListenerOrEventListenerObject) => void;
  declare removeEventListener: (event: "candlesLoad.success", callback: EventListenerOrEventListenerObject) => void;

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
    const priceDecimals = token.priceDecimals ?? 2;

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
      pricescale: Math.max(1, 10 ** priceDecimals / visualMultiplier),
    };

    setTimeout(() => {
      onResolve(symbolInfo);
    }, 0);
  }

  async getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback
  ): Promise<void> {
    let isFirst = metricsIsFirstLoadTime;
    metricsIsFirstLoadTime = false;

    metricsRequestId = metricsRequestId ?? getRequestId();

    metrics.pushEvent<LoadingStartEvent>({
      event: "candlesLoad.started",
      isError: false,
      time: metrics.getTime("candlesLoad", true),
      data: {
        requestId: metricsRequestId,
        isFirstTimeLoad: isFirst,
      },
    });

    metrics.startTimer("candlesLoad");

    const to = periodParams.to;

    const offset = Math.trunc(Math.max((Date.now() / 1000 - to) / RESOLUTION_TO_SECONDS[resolution], 0));
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
        bars = await this.fetchCandles(
          symbolInfo.name,
          resolution,
          countBack + offset,
          false,
          periodParams.firstDataRequest
        );
      } else {
        const currentCandleTime = getCurrentCandleTime(SUPPORTED_RESOLUTIONS_V2[resolution]);
        bars = this.getStableCandles(currentCandleTime, resolution, countBack + offset);
      }
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

    const barsToReturn: FromOldToNewArray<Bar> = [];
    const visualMultiplier = parseInt(symbolInfo.unit_id ?? "1");

    for (const bar of bars) {
      if (bar.time <= to) {
        barsToReturn.push(multiplyBarValues(formatTimeInBarToMs(bar), visualMultiplier));
      } else {
        break;
      }
    }

    onResult(barsToReturn, { noData: offset + countBack >= 10_000 });

    metrics.pushEvent<LoadingSuccessEvent>({
      event: "candlesLoad.success",
      isError: false,
      time: metrics.getTime("candlesLoad", true),
      data: {
        requestId: metricsRequestId!,
        isFirstTimeLoad: isFirst,
      },
    });

    this.dispatchEvent(
      new CustomEvent("candlesLoad.success", {
        detail: {
          requestId: metricsRequestId!,
          isFirstTimeLoad: isFirst,
        },
      })
    );

    metrics.pushEvent<LoadingSuccessEvent>({
      event: "candlesDisplay.success",
      isError: false,
      time: metrics.getTime("candlesDisplay", true),
      data: {
        requestId: metricsRequestId!,
        isFirstTimeLoad: isFirst,
      },
    });

    if (periodParams.firstDataRequest) {
      this.saveTVParamsCache(this.chainId, { resolution, countBack: periodParams.countBack });
    }
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
        let candlesToFetch = 1;

        const currentCandleTime = getCurrentCandleTime(SUPPORTED_RESOLUTIONS_V2[resolution]);

        if (lastReturnedValue) {
          const periodSeconds = RESOLUTION_TO_SECONDS[resolution];

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

        for (const price of prices) {
          if (lastReturnedValue?.time && price.time < lastReturnedValue.time) {
            continue;
          }

          if (lastReturnedValue?.time && price.time > lastReturnedValue.time && !didPatchPreviousCandle) {
            didPatchPreviousCandle = true;
            const previousBarWithNewClose = {
              ...lastReturnedValue,
              close: price.open,
              low: Math.min(lastReturnedValue.low, price.open),
              high: Math.max(lastReturnedValue.high, price.open),
            };

            onTick(multiplyBarValues(formatTimeInBarToMs(previousBarWithNewClose), visualMultiplier));
          }

          onTick(multiplyBarValues(formatTimeInBarToMs(price), visualMultiplier));

          newLastReturnedValue = price;
        }

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
        supported_resolutions: Object.keys(
          this.tradePageVersion === 1 ? SUPPORTED_RESOLUTIONS_V1 : SUPPORTED_RESOLUTIONS_V2
        ) as ResolutionString[],
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
      });
    }, 0);
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

    let resolution: ResolutionString;
    let countBack: number;

    try {
      const cache: TvParamsCache = JSON.parse(tvCache);
      resolution = cache.resolution;
      countBack = cache.countBack;
    } catch (e) {
      return undefined;
    }

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
    Object.values(this.subscriptions).forEach((subscription) => subscription.pause());
  }

  private resumeAll() {
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

    count = Math.min(count, 10000);

    if (this.tradePageVersion === 1) {
      return Promise.race([
        getLimitChartPricesFromStats(this.chainId, symbol, SUPPORTED_RESOLUTIONS_V1[resolution], count),
        sleep(5000).then(() => Promise.reject("Stats candles timeout")),
      ])
        .catch((ex) => {
          // eslint-disable-next-line no-console
          console.warn(ex, "Switching to graph chainlink data");
          return Promise.race([
            getChainlinkChartPricesFromGraph(symbol, SUPPORTED_RESOLUTIONS_V1[resolution]),
            sleep(5000).then(() => Promise.reject("Chainlink candles timeout")),
          ]);
        })
        .catch((ex) => {
          // eslint-disable-next-line no-console
          console.warn("Load history candles failed", ex);
          return [];
        });
    }

    return Promise.race([
      this.oracleFetcher
        .fetchOracleCandles(symbol, SUPPORTED_RESOLUTIONS_V2[resolution], count)
        .then((bars) => bars.slice().reverse()),
      sleep(5000).then(() => Promise.reject("Oracle candles timeout")),
    ])
      .catch((ex) => {
        // eslint-disable-next-line no-console
        console.warn(ex, "Switching to graph chainlink data");
        return Promise.race([
          getChainlinkChartPricesFromGraph(symbol, SUPPORTED_RESOLUTIONS_V2[resolution]),
          sleep(5000).then(() => Promise.reject("Chainlink candles timeout")),
        ]);
      })
      .catch((ex) => {
        // eslint-disable-next-line no-console
        console.warn("Load history candles failed", ex);
        return [];
      });
  }

  private getStableCandles(to: number, resolution: ResolutionString, count: number) {
    const periodSeconds = RESOLUTION_TO_SECONDS[resolution];
    return range(count, 0, -1).map((i) => ({
      time: to - i * periodSeconds,
      open: 1,
      close: 1,
      high: 1,
      low: 1,
    }));
  }

  destroy() {
    Object.values(this.subscriptions).forEach((subscription) => subscription.destroy());
    document.removeEventListener("visibilitychange", this.visibilityHandler);
  }
}
