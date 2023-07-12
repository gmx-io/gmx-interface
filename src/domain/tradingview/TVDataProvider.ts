import { LAST_BAR_REFRESH_INTERVAL } from "config/tradingview";
import { getLimitChartPricesFromStats, timezoneOffset } from "domain/prices";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { Bar } from "./types";
import { formatTimeInBarToMs, getCurrentCandleTime, getMax, getMin } from "./utils";
import { fillBarGaps, getStableCoinPrice, getTokenChartPrice } from "./requests";
import { PeriodParams } from "charting_library";

const initialState = {
  lastBar: null,
  currentBar: null,
  startTime: 0,
  lastTicker: "",
  lastPeriod: "",
  barsInfo: {
    period: "",
    data: [],
    ticker: "",
  },
};

export class TVDataProvider {
  lastBar: Bar | null;
  currentBar: Bar | null;
  startTime: number;
  lastTicker: string;
  lastPeriod: string;
  getCurrentPrice: (symbol: string) => number | undefined;
  supportedResolutions: { [key: number]: string };
  barsInfo: {
    period: string;
    data: Bar[];
    ticker: string;
  };

  constructor({ getCurrentPrice, resolutions }) {
    const { lastBar, currentBar, startTime, lastTicker, lastPeriod, barsInfo: initialHistoryBarsInfo } = initialState;
    this.lastBar = lastBar;
    this.currentBar = currentBar;
    this.startTime = startTime;
    this.lastTicker = lastTicker;
    this.lastPeriod = lastPeriod;
    this.barsInfo = initialHistoryBarsInfo;
    this.getCurrentPrice = getCurrentPrice;
    this.supportedResolutions = resolutions;
  }

  async getLimitBars(chainId: number, ticker: string, period: string, limit: number): Promise<Bar[]> {
    const prices = await getLimitChartPricesFromStats(chainId, ticker, period, limit);
    return prices;
  }

  async getCurrentPriceOfToken(ticker: string): Promise<number | undefined> {
    const currentPrice = this.getCurrentPrice(ticker);
    const price = parseFloat(formatAmount(currentPrice, USD_DECIMALS, 4));
    return price;
  }

  async getTokenLastBars(chainId: number, ticker: string, period: string, limit: number): Promise<Bar[]> {
    return this.getLimitBars(chainId, ticker, period, limit);
  }

  async getTokenChartPrice(chainId: number, ticker: string, period: string): Promise<Bar[]> {
    return getTokenChartPrice(chainId, ticker, period);
  }

  async getTokenHistoryBars(
    chainId: number,
    ticker: string,
    period: string,
    periodParams: PeriodParams
  ): Promise<Bar[]> {
    const barsInfo = this.barsInfo;
    if (!barsInfo.data.length || barsInfo.ticker !== ticker || barsInfo.period !== period) {
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
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        this.barsInfo = initialState.barsInfo;
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

  async getBars(chainId: number, ticker: string, resolution: string, isStable: boolean, periodParams: PeriodParams) {
    const period = this.supportedResolutions[resolution];
    const { from, to } = periodParams;

    // getBars is called on period and token change so it's better to rest the values
    this.resetState();

    try {
      const bars = isStable
        ? getStableCoinPrice(period, from, to)
        : await this.getTokenHistoryBars(chainId, ticker, period, periodParams);

      return bars.map(formatTimeInBarToMs);
    } catch {
      throw new Error("Failed to get history bars");
    }
  }

  async getMissingBars(chainId: number, ticker: string, period: string, from: number) {
    if (!ticker || !period || !chainId || !from) return;
    const periodSeconds = CHART_PERIODS[period];
    const currentPeriod = getCurrentCandleTime(period);
    const barsCount = Math.ceil((currentPeriod - from) / periodSeconds) + 1;

    if (from === currentPeriod) return;
    if (barsCount > 0) {
      const bars = await this.getLimitBars(chainId, ticker, period, barsCount);
      if (bars && ticker === this.barsInfo.ticker && period === this.barsInfo.period) {
        this.lastBar = bars[bars.length - 1];
        this.currentBar = null;
      }
      return bars.filter((bar) => bar.time >= from);
    }
  }

  async getLastBar(chainId: number, ticker: string, period: string) {
    if (!ticker || !period || !chainId) {
      throw new Error("Invalid input. Ticker, period, and chainId are required parameters.");
    }
    const currentTime = Date.now();
    if (
      currentTime - this.startTime > LAST_BAR_REFRESH_INTERVAL ||
      this.lastTicker !== ticker ||
      this.lastPeriod !== period
    ) {
      const prices = await this.getTokenLastBars(chainId, ticker, period, 1);
      const currentPrice = await this.getCurrentPriceOfToken(ticker);

      if (prices?.length && currentPrice) {
        const lastBar = prices[0];
        const currentCandleTime = getCurrentCandleTime(period);
        const lastCandleTime = currentCandleTime - CHART_PERIODS[period];
        if (lastBar.time === currentCandleTime) {
          this.lastBar = { ...lastBar, close: currentPrice, ticker, period };
          this.startTime = currentTime;
          this.lastTicker = ticker;
          this.lastPeriod = period;
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

  async getLiveBar(chainId: number, ticker: string, period: string) {
    if (!ticker || !period || !chainId) return;

    const currentCandleTime = getCurrentCandleTime(period);
    try {
      this.lastBar = await this.getLastBar(chainId, ticker, period);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }

    const currentPrice = await this.getCurrentPriceOfToken(ticker);
    if (!this.lastBar?.time || !currentPrice || ticker !== this.lastBar.ticker || ticker !== this.barsInfo.ticker) {
      return;
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
  get resolutions() {
    return this.supportedResolutions;
  }
  get currentPeriod() {
    return this.barsInfo.period;
  }
  get currentTicker() {
    return this.barsInfo.ticker;
  }
  resetState() {
    this.lastBar = initialState.lastBar;
    this.currentBar = initialState.currentBar;
    this.lastTicker = initialState.lastTicker;
    this.lastPeriod = initialState.lastPeriod;
    this.startTime = initialState.startTime;
    this.barsInfo = initialState.barsInfo;
  }
}
