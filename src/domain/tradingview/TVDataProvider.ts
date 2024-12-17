import { LAST_BAR_FETCH_INTERVAL, SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { getLimitChartPricesFromStats, timezoneOffset } from "domain/prices";
import { CHART_PERIODS } from "lib/legacy";
import { Bar, FromOldToNewArray, TvParamsCache } from "./types";
import { formatTimeInBarToMs, getCurrentCandleTime, getMax, getMin } from "./utils";
import { fillBarGaps, getStableCoinPrice, getTokenChartPrice } from "./requests";
import { PeriodParams } from "charting_library";
import { getTokenBySymbol } from "config/tokens";
import { getTvParamsCacheKey } from "config/localStorage";

// const initialHistoryBarsInfo = {
//   period: "",
//   data: [],
//   ticker: "",
// };

const initialState = {
  chainId: null,
  latestBarRefreshTime: 0,
  barsInfo: {
    period: "",
    data: [],
    ticker: "",
  },
  chartTokenInfo: {
    price: 0,
    ticker: "",
    isChartReady: false,
  },
};

export class TVDataProvider {
  chainId: number | null = null;
  liveBars: Bar[] = [];
  supportedResolutions: { [key: number]: string };
  barsInfo: {
    period: string;
    data: Bar[];
    ticker: string;
  };
  chartTokenInfo?: {
    price: number;
    ticker: string;
    isChartReady: boolean;
  };
  shouldResetCache = false;

  updateInterval?: ReturnType<typeof setInterval>;
  historyBarsPromise?: Promise<FromOldToNewArray<Bar>>;
  isV2 = false;

  onBarsLoadStarted?: () => void;
  onBarsLoaded?: () => void;
  onBarsLoadFailed?: (error: Error) => void;

  constructor({ resolutions, chainId }: { resolutions: { [key: number]: string }; chainId: number }) {
    const { barsInfo, chartTokenInfo } = initialState;
    this.chainId = chainId;
    this.barsInfo = barsInfo;
    this.supportedResolutions = resolutions;
    this.chartTokenInfo = chartTokenInfo;

    this.updateInterval = setInterval(() => {
      this.updateLiveBars();
    }, LAST_BAR_FETCH_INTERVAL);
  }

  resetCache() {
    this.shouldResetCache = true;
  }

  finalize() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.liveBars = [];
    }
  }

  clearLiveBars() {
    this.liveBars = [];
  }

  async updateLiveBars() {

    if (!this.chainId || !this.currentTicker || !this.currentPeriod) {
      return;
    }   

    const prices: FromOldToNewArray<Bar> = await this.getTokenLastBars(
      this.chainId,
      this.currentTicker,
      this.currentPeriod,
      1
    );

   

    if (!prices.length) {
      return;
    }

    const latestBar = { ...prices[0] };
    
    latestBar.ticker = this.currentTicker;
    latestBar.period = this.currentPeriod;

    const lastSavedBar = this.liveBars[this.liveBars.length - 1];

    if (this.currentPrice) {
    
      latestBar.close = prices[0].close;
    }

    /**
     * Clear live bars when ticker or period changes to prevent incorrect bar creation
     */
    if (
      latestBar &&
      lastSavedBar &&
      (latestBar.ticker !== lastSavedBar.ticker || latestBar.period !== lastSavedBar.period)
    ) {
      this.liveBars = [];
      return;
    }

    if (lastSavedBar && latestBar.time !== lastSavedBar?.time) {
     
      this.liveBars.push(latestBar);
      this.liveBars[0].close = this.liveBars[1].open;
    } else {
     
      this.liveBars = [latestBar];
    }
  }

  async getLimitBars(chainId: number, ticker: string, period: string, limit: number): Promise<FromOldToNewArray<Bar>> {
    const prices = await getLimitChartPricesFromStats(chainId, ticker, period, limit);
    return prices;
  }

  async getTokenLastBars(
    chainId: number,
    ticker: string,
    period: string,
    limit: number
  ): Promise<FromOldToNewArray<Bar>> {
    return this.getLimitBars(chainId, ticker, period, limit);
  }

  async getTokenChartPrice(
    chainId: number,
    ticker: string,
    period: string,
    onFallback?: (ex: Error) => void
  ): Promise<FromOldToNewArray<Bar>> {
    return getTokenChartPrice(chainId, ticker, period, onFallback);
  }

  async getTokenHistoryBars(
    chainId: number,
    ticker: string,
    period: string,
    periodParams: PeriodParams
  ): Promise<FromOldToNewArray<Bar>> {
    const barsInfo = this.barsInfo;

    if (this.shouldResetCache || !barsInfo.data.length || barsInfo.ticker !== ticker || barsInfo.period !== period) {
      const isAlreadyRunning = Boolean(this.historyBarsPromise);

      if (!isAlreadyRunning) {
        this.onBarsLoadStarted?.();
      }

      try {
        this.liveBars = [];

        // Do not re-run request if it's already in progress
        if (!this.historyBarsPromise) {
          this.historyBarsPromise = this.getTokenChartPrice(chainId, ticker, period, this.onBarsLoadFailed);
        }

        const bars = await this.historyBarsPromise;
        this.historyBarsPromise = undefined;

        const filledBars = fillBarGaps(bars, CHART_PERIODS[period]);
        const latestBar = bars[bars.length - 1];

        if (latestBar) {
          this.liveBars = [{ ...latestBar, ticker, period }];
        }

        this.barsInfo.data = filledBars;
        this.barsInfo.ticker = ticker;
        this.barsInfo.period = period;
        this.shouldResetCache = false;

        if (!isAlreadyRunning) {
          this.onBarsLoaded?.();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        this.barsInfo = initialState.barsInfo;
        this.shouldResetCache = false;
        this.onBarsLoadFailed?.(error);
      }
    }

    const { from, to, countBack } = periodParams;
    const toWithOffset = to + timezoneOffset;
    const fromWithOffset = from + timezoneOffset;

    const bars = barsInfo.data.filter((bar) => bar.time > fromWithOffset && bar.time <= toWithOffset);

    // if no bars returned, return empty array
    if (!bars.length) {
      return [];
    }

    // if bars are fewer than countBack, return all of them
    if (bars.length < countBack) {
      return bars;
    }

    // if bars are more than countBack, return latest bars
    return bars.slice(bars.length - countBack, bars.length);
  }

  async getBars(
    chainId: number,
    ticker: string,
    resolution: string,
    isStable: boolean,
    periodParams: PeriodParams
  ): Promise<FromOldToNewArray<Bar>> {
    const period = this.supportedResolutions[resolution];
    const { from, to } = periodParams;

    try {
      const bars: FromOldToNewArray<Bar> = isStable
        ? getStableCoinPrice(period, from, to)
        : await this.getTokenHistoryBars(chainId, ticker, period, periodParams);

      return bars.map(formatTimeInBarToMs) as FromOldToNewArray<Bar>;
    } catch {
      throw new Error("Failed to get history bars");
    }
  }

  async getMissingBars(
    chainId: number,
    ticker: string,
    period: string,
    from: number
  ): Promise<FromOldToNewArray<Bar> | undefined> {
    if (!ticker || !period || !chainId || !from) return;
    const barsInfo = this.barsInfo;
    const periodSeconds = CHART_PERIODS[period];
    const currentPeriod = getCurrentCandleTime(period);
    const barsCount = Math.ceil((currentPeriod - from) / periodSeconds) + 1;

    if (from === currentPeriod) return;
    if (barsCount > 0) {
      const bars = await this.getLimitBars(chainId, ticker, period, barsCount);

      if (bars && ticker === barsInfo.ticker && period === barsInfo.period) {
        this.liveBars = [{ ...bars.slice(-1)[0], ticker, period }];
      }

      return bars.filter((bar) => bar.time >= from).sort((a, b) => a.time - b.time) as FromOldToNewArray<Bar>;
    }
  }

  getLiveBars(chainId: number, ticker: string, period: string): Bar[] {
    if (!ticker || !period || !chainId) return [];

    const barsInfo = this.barsInfo;
    const latestBar = this.liveBars[this.liveBars.length - 1];

    if (
      !latestBar ||
      !this.chartTokenInfo?.isChartReady ||
      barsInfo.ticker !== latestBar.ticker ||
      ticker !== barsInfo.ticker ||
      chainId !== this.chainId
    ) {
      return [];
    }

    const liveBars = [...this.liveBars];

    if (liveBars.length > 1) {
      this.liveBars = [this.liveBars[1]];
    }

    return liveBars;
  }

  initializeBarsRequest(chainId: number, symbol: string) {
    const cachedParams = this.getInitialTVParamsFromCache(chainId);

    if (cachedParams) {
      const { from, to, countBack } = cachedParams;
      const isStable = Boolean(getTokenBySymbol(chainId, symbol).isStable);
      this.getBars(chainId, symbol, cachedParams.resolution, isStable, {
        from,
        to,
        countBack: countBack,
        firstDataRequest: true,
      });
    }
  }

  setCurrentChartToken(chartTokenInfo: { price: number; ticker: string; isChartReady: boolean }) {
    this.chartTokenInfo = chartTokenInfo;

    const latestBar = this.liveBars[this.liveBars.length - 1];

    if (latestBar) {
      latestBar.close = chartTokenInfo.price;
      latestBar.high = getMax(latestBar.open, latestBar.high, this.currentPrice);
      latestBar.low = getMin(latestBar.open, latestBar.low, this.currentPrice);
    }
  }

  setChainId(chainId: number) {
    this.chainId = chainId;
  }

  setOnBarsLoadStarted(cb: () => void) {
    this.onBarsLoadStarted = cb;
  }

  setOnBarsLoaded(cb: () => void) {
    this.onBarsLoaded = cb;
  }

  setOnBarsLoadFailed(cb: (error: Error) => void) {
    this.onBarsLoadFailed = cb;
  }

  saveTVParamsCache(chainId: number, { resolution, countBack }: TvParamsCache) {
    localStorage.setItem(getTvParamsCacheKey(chainId, this.isV2), JSON.stringify({ resolution, countBack }));
  }

  getInitialTVParamsFromCache(chainId: number) {
    const tvCache = localStorage.getItem(getTvParamsCacheKey(chainId, this.isV2));

    if (!tvCache) {
      return undefined;
    }

    const { countBack, resolution }: TvParamsCache = JSON.parse(tvCache);
    const period = SUPPORTED_RESOLUTIONS[resolution];

    if (!period) {
      return undefined;
    }

    const to = Math.floor(Date.now() / 1000);
    const timeBetween = period * countBack;
    const from = to - timeBetween;

    return {
      from,
      to,
      countBack,
      resolution,
    };
  }

  get currentPrice() {
    return this.chartTokenInfo?.price;
  }

  get resolutions() {
    return this.supportedResolutions;
  }

  get currentPeriod() {
    return this.barsInfo.period;
  }

  get currentTicker() {
    return this.barsInfo.ticker;
  }
}


// export class TVDataProvider {
//   lastBar: Bar | null;
//   startTime: number;
//   lastTicker: string;
//   lastPeriod: string;
//   barsInfo: {
//     period: string;
//     data: Bar[];
//     ticker: string;
//   };

//   constructor() {
//     this.lastBar = null;
//     this.startTime = 0;
//     this.lastTicker = "";
//     this.lastPeriod = "";
//     this.barsInfo = initialHistoryBarsInfo;
//   }

//   async getCurrentPriceOfToken(chainId: number, ticker: string): Promise<BigNumberish> {
//     return getCurrentPriceOfToken(chainId, ticker);
//   }

//   async getTokenLastBars(chainId: number, ticker: string, period: string, limit: number): Promise<Bar[]> {
//     return getLimitChartPricesFromStats(chainId, ticker, period, limit);
//   }
//   async getTokenChartPrice(chainId: number, ticker: string, period: string): Promise<Bar[]> {
//     return getTokenChartPrice(chainId, ticker, period);
//   }

//   async getTokenHistoryBars(
//     chainId: number,
//     ticker: string,
//     period: string,
//     periodParams: PeriodParams,
//     shouldRefetchBars: boolean
//   ): Promise<Bar[]> {
//     const barsInfo = this.barsInfo;
//     if (!barsInfo.data.length || barsInfo.ticker !== ticker || barsInfo.period !== period || shouldRefetchBars) {
//       try {
//         // const bars = await this.getTokenChartPrice(chainId, ticker, period);
//         // const filledBars = fillBarGaps(bars, CHART_PERIODS[period]);
//         const filledBars = await this.getTokenChartPrice(chainId, ticker, period);
//         const currentCandleTime = getCurrentCandleTime(period);
//         const lastCandleTime = currentCandleTime - CHART_PERIODS[period];
//         const lastBar = filledBars[filledBars.length - 1];
//         if (lastBar.time === currentCandleTime || lastBar.time === lastCandleTime) {
//           this.lastBar = { ...lastBar, ticker };
//         }
//         this.barsInfo.data = filledBars;
//         this.barsInfo.ticker = ticker;
//         this.barsInfo.period = period;
//       } catch (error) {
//         // eslint-disable-next-line no-console
//         console.error(error);
//         this.barsInfo = initialHistoryBarsInfo;
//       }
//     }

//     const { from, to, countBack } = periodParams;
//     const toWithOffset = to + timezoneOffset;
//     const fromWithOffset = from + timezoneOffset;
//     const bars = barsInfo.data.filter((bar) => bar.time > fromWithOffset && bar.time <= toWithOffset);

//     // if no bars returned, return empty array
//     if (!bars.length) {
//       return [];
//     }

//     // if bars are fewer than countBack, return all of them
//     if (bars.length < countBack) {
//       return bars;
//     }

//     // if bars are more than countBack, return latest bars
//     return bars.slice(bars.length - countBack, bars.length);
//   }

//   async getBars(
//     chainId: number,
//     ticker: string,
//     resolution: string,
//     isStable: boolean,
//     periodParams: PeriodParams,
//     shouldRefetchBars: boolean
//   ) {
//     const period = SUPPORTED_RESOLUTIONS[resolution];
//     const { from, to } = periodParams;

//     try {
//       const bars = isStable
//         ? getStableCoinPrice(period, from, to)
//         : await this.getTokenHistoryBars(chainId, ticker, period, periodParams, shouldRefetchBars);

//       return bars.map(formatTimeInBarToMs);
//     } catch {
//       throw new Error("Failed to get history bars");
//     }
//   }

//   async getLastBar(chainId: number, ticker: string, period: string) {
//     if (!ticker || !period || !chainId) {
//       throw new Error("Invalid input. Ticker, period, and chainId are required parameters.");
//     }
//     const currentTime = Date.now();
//     if (
//       currentTime - this.startTime > LAST_BAR_REFRESH_INTERVAL ||
//       this.lastTicker !== ticker ||
//       this.lastPeriod !== period
//     ) {
//       const prices = await this.getTokenLastBars(chainId, ticker, period, 1);
//       if (prices?.length) {
//         // @ts-ignore
//         const lastBar = prices[0];
//         const currentCandleTime = getCurrentCandleTime(period);
//         const lastCandleTime = currentCandleTime - CHART_PERIODS[period];
//         if (lastBar.time === currentCandleTime || lastBar.time === lastCandleTime) {
//           this.lastBar = { ...lastBar, ticker };
//           this.startTime = currentTime;
//           this.lastTicker = ticker;
//           this.lastPeriod = period;
//         }
//       }
//     }
//     return this.lastBar;
//   }

//   async getLiveBar(chainId: number, ticker: string, resolution: string) {
//     const period = SUPPORTED_RESOLUTIONS[resolution];
//     if (!ticker || !period || !chainId) return;

//     const currentCandleTime = getCurrentCandleTime(period);
//     try {
//       this.lastBar = await this.getLastBar(chainId, ticker, period);
//     } catch (error) {
//       // eslint-disable-next-line no-console
//       console.error(error);
//     }

//     if (!this.lastBar) return;

//     const currentPrice = await this.getCurrentPriceOfToken(chainId, ticker);
//     const averagePriceValue = parseFloat(formatAmount(currentPrice, USD_DECIMALS, 4));
//     if (this.lastBar.time && currentCandleTime === this.lastBar.time && ticker === this.lastBar.ticker) {
//       return {
//         ...this.lastBar,
//         close: averagePriceValue,
//         high: Math.max(this.lastBar.open, this.lastBar.high, averagePriceValue),
//         low: Math.min(this.lastBar.open, this.lastBar.low, averagePriceValue),
//         ticker,
//       };
//     } else {
//       const newBar = {
//         time: currentCandleTime,
//         open: this.lastBar.close,
//         close: averagePriceValue,
//         high: Math.max(this.lastBar.close, averagePriceValue),
//         low: Math.min(this.lastBar.close, averagePriceValue),
//         ticker,
//       };
//       this.lastBar = newBar;
//       return this.lastBar;
//     }
//   }
// }
