import { LAST_BAR_REFRESH_INTERVAL } from "config/tradingview";
import { getLimitChartPricesFromStats, TIMEZONE_OFFSET_SEC } from "domain/prices";
import { CHART_PERIODS } from "lib/legacy";
import { Bar, FromOldToNewArray } from "./types";
import { formatTimeInBarToMs, getCurrentCandleTime, getMax, getMin } from "./utils";
import { fillBarGaps, getStableCoinPrice, getTokenChartPrice } from "./requests";
import { PeriodParams } from "charting_library";

const initialState = {
  lastBar: null,
  currentBar: null,
  lastBarRefreshTime: 0,
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
  lastBar: Bar | null;
  currentBar: Bar | null;
  lastBarRefreshTime: number;
  getCurrentPrice: (symbol: string) => number | undefined;
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

  constructor({ resolutions }: { resolutions: { [key: number]: string } }) {
    const { lastBar, currentBar, lastBarRefreshTime, barsInfo, chartTokenInfo } = initialState;
    this.lastBar = lastBar;
    this.currentBar = currentBar;
    this.lastBarRefreshTime = lastBarRefreshTime;
    this.barsInfo = barsInfo;
    this.supportedResolutions = resolutions;
    this.chartTokenInfo = chartTokenInfo;
  }

  resetCache() {
    this.shouldResetCache = true;
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

  async getTokenChartPrice(chainId: number, ticker: string, period: string): Promise<FromOldToNewArray<Bar>> {
    return getTokenChartPrice(chainId, ticker, period);
  }

  async getTokenHistoryBars(
    chainId: number,
    ticker: string,
    period: string,
    periodParams: PeriodParams
  ): Promise<FromOldToNewArray<Bar>> {
    const barsInfo = this.barsInfo;
    if (this.shouldResetCache || !barsInfo.data.length || barsInfo.ticker !== ticker || barsInfo.period !== period) {
      try {
        const bars = await this.getTokenChartPrice(chainId, ticker, period);
        const filledBars = fillBarGaps(bars, CHART_PERIODS[period]);
        const currentCandleTime = getCurrentCandleTime(period);
        const lastBar = bars[bars.length - 1];
        if (lastBar.time === currentCandleTime) {
          this.lastBar = { ...lastBar, ticker, period };
        }
        this.barsInfo.data = filledBars;
        this.barsInfo.ticker = ticker;
        this.barsInfo.period = period;
        this.shouldResetCache = false;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        this.barsInfo = initialState.barsInfo;
        this.shouldResetCache = false;
      }
    }

    const { from, to, countBack } = periodParams;
    const toWithOffset = to + TIMEZONE_OFFSET_SEC;
    const fromWithOffset = from + TIMEZONE_OFFSET_SEC;

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
        this.lastBar = bars[bars.length - 1];
        this.currentBar = null;
      }

      return bars.filter((bar) => bar.time >= from).sort((a, b) => a.time - b.time) as FromOldToNewArray<Bar>;
    }
  }

  async getLastBar(chainId: number, ticker: string, period: string): Promise<Bar | null> {
    if (!ticker || !period || !chainId) {
      throw new Error("Invalid input. Ticker, period, and chainId are required parameters.");
    }

    if (!this.chartTokenInfo) {
      return null;
    }

    const currentTime = Date.now();

    if (
      currentTime - this.lastBarRefreshTime > LAST_BAR_REFRESH_INTERVAL ||
      this.lastBar?.ticker !== ticker ||
      this.lastBar?.period !== period ||
      this.chartTokenInfo.ticker !== this.barsInfo.ticker
    ) {
      const prices: FromOldToNewArray<Bar> = await this.getTokenLastBars(chainId, ticker, period, 1);
      const currentPrice = this.chartTokenInfo.ticker === this.barsInfo.ticker && this.chartTokenInfo.price;

      if (prices?.length && currentPrice) {
        const lastBar = prices.at(-1)!;
        const currentCandleTime = getCurrentCandleTime(period);
        const lastCandleTime = currentCandleTime - CHART_PERIODS[period];

        if (!this.lastBar) {
          this.lastBar = lastBar;
        }

        if (lastBar.time === currentCandleTime) {
          this.lastBar = { ...lastBar, close: currentPrice, ticker, period };
          this.lastBarRefreshTime = currentTime;
        }
        if (this.lastBar && lastBar.time === lastCandleTime) {
          this.lastBar = {
            open: this.lastBar.close,
            high: this.lastBar.close,
            low: this.lastBar.close,
            time: currentCandleTime,
            close: currentPrice,
            ticker,
            period,
          };
        }
      }
    }
    return this.lastBar;
  }

  async getLiveBar(chainId: number, ticker: string, period: string): Promise<Bar | undefined> {
    if (!ticker || !period || !chainId) return;
    const barsInfo = this.barsInfo;
    const currentCandleTime = getCurrentCandleTime(period);
    try {
      this.lastBar = await this.getLastBar(chainId, ticker, period);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    const currentPrice = this.chartTokenInfo?.ticker === barsInfo.ticker && this.chartTokenInfo.price;

    if (
      !this.chartTokenInfo?.isChartReady ||
      !this.lastBar?.time ||
      !currentPrice ||
      barsInfo.ticker !== this.lastBar.ticker ||
      ticker !== barsInfo.ticker
    ) {
      return;
    }

    if (this.currentBar?.ticker !== barsInfo.ticker || this.currentBar?.period !== barsInfo.period) {
      this.currentBar = null;
    }

    if (currentCandleTime === this.lastBar.time) {
      this.currentBar = {
        ...this.lastBar,
        close: currentPrice,
        high: getMax(this.lastBar.open, this.lastBar.high, currentPrice, this.currentBar?.high),
        low: getMin(this.lastBar.open, this.lastBar.low, currentPrice, this.currentBar?.low),
        ticker,
        period,
      };
    } else {
      const { close } = this.currentBar ? this.currentBar : this.lastBar;
      const newBar = {
        time: currentCandleTime,
        open: close,
        close: currentPrice,
        high: getMax(close, currentPrice),
        low: getMin(close, currentPrice),
        ticker,
        period,
      };
      this.lastBar = newBar;
      this.currentBar = newBar;
    }
    return this.currentBar;
  }
  setCurrentChartToken(chartTokenInfo: { price: number; ticker: string; isChartReady: boolean }) {
    this.chartTokenInfo = chartTokenInfo;
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
