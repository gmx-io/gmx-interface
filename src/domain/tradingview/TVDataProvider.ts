import { LAST_BAR_REFRESH_INTERVAL, SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { getLimitChartPricesFromStats, getStablePriceData, timezoneOffset } from "domain/prices";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { Bar } from "./types";
import { formatTimeInBar } from "./utils";
import { fillBarGaps, getCurrentPriceOfToken, getTokenChartPrice } from "./requests";
import { BigNumberish } from "ethers";
import { PeriodParams } from "charting_library";

const initialHistoryBarsInfo = {
  period: "",
  data: [],
  ticker: "",
};

export class TVDataProvider {
  lastBar: Bar | null;
  startTime: number;
  lastTicker: string;
  lastPeriod: string;
  barsInfo: {
    period: string;
    data: Bar[];
    ticker: string;
  };

  constructor() {
    this.lastBar = null;
    this.startTime = 0;
    this.lastTicker = "";
    this.lastPeriod = "";
    this.barsInfo = initialHistoryBarsInfo;
  }

  async getCurrentPriceOfToken(chainId: number, ticker: string): Promise<BigNumberish> {
    return getCurrentPriceOfToken(chainId, ticker);
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
        const bars = await getTokenChartPrice(chainId, ticker, period);
        const filledBars = fillBarGaps(bars, CHART_PERIODS[period]);
        this.barsInfo.data = filledBars;
        this.barsInfo.ticker = ticker;
        this.barsInfo.period = period;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        this.barsInfo = initialHistoryBarsInfo;
      }
    }

    const { from, to, countBack } = periodParams;
    const toWithOffset = to + timezoneOffset;
    const fromWithOffset = from + timezoneOffset;
    const bars = barsInfo.data
      .filter((bar) => bar.time > fromWithOffset && bar.time <= toWithOffset)
      .map(formatTimeInBar);

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

  async getTokenLastBars(chainId: number, ticker: string, period: string, limit: number): Promise<Bar[]> {
    return getLimitChartPricesFromStats(chainId, ticker, period, limit);
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
      if (prices?.length) {
        // @ts-ignore
        this.lastBar = formatTimeInBar({ ...prices[prices.length - 1], ticker });
        this.startTime = currentTime;
        this.lastTicker = ticker;
        this.lastPeriod = period;
      }
    }
    return this.lastBar;
  }

  async getHistoryBars(
    chainId: number,
    ticker: string,
    resolution: string,
    isStable: boolean,
    periodParams: PeriodParams
  ) {
    const period = SUPPORTED_RESOLUTIONS[resolution];
    const { countBack } = periodParams;

    try {
      return isStable
        ? getStablePriceData(period, countBack)
        : await this.getTokenHistoryBars(chainId, ticker, period, periodParams);
    } catch {
      throw new Error("Failed to get history bars");
    }
  }

  async syncPastBars(chainId: number, ticker: string, resolution: string, lastStoredTimestamp: number) {
    const period = SUPPORTED_RESOLUTIONS[resolution];
    if (!ticker || !period || !chainId || !lastStoredTimestamp) return;
    const periodSeconds = CHART_PERIODS[period];
    const lastStoredPeriod = lastStoredTimestamp / 1000 - timezoneOffset;
    const currentPeriod = Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds;
    if (lastStoredPeriod === currentPeriod) return;
    const periods = Math.floor((currentPeriod - lastStoredPeriod) / periodSeconds) + 1;
    if (periods > 0) {
      const bars = await getLimitChartPricesFromStats(chainId, ticker, period, periods);
      return fillBarGaps(bars, periodSeconds)
        .filter((bar) => bar.time >= lastStoredPeriod)
        .map(formatTimeInBar);
    }
  }

  async getLiveBar(chainId: number, ticker: string, resolution: string) {
    const period = SUPPORTED_RESOLUTIONS[resolution];
    if (!ticker || !period || !chainId) return;
    const periodSeconds = CHART_PERIODS[period];
    // Converts current time to seconds, rounds down to nearest period, adds timezone offset, and converts back to milliseconds
    const currentCandleTime = (Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds + timezoneOffset) * 1000;
    try {
      this.lastBar = await this.getLastBar(chainId, ticker, period);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }

    if (!this.lastBar) return;

    const currentPrice = await this.getCurrentPriceOfToken(chainId, ticker);
    const averagePriceValue = parseFloat(formatAmount(currentPrice, USD_DECIMALS, 4));
    if (this.lastBar.time && currentCandleTime === this.lastBar.time && ticker === this.lastBar.ticker) {
      return {
        ...this.lastBar,
        close: averagePriceValue,
        high: Math.max(this.lastBar.open, this.lastBar.high, averagePriceValue),
        low: Math.min(this.lastBar.open, this.lastBar.low, averagePriceValue),
        ticker,
      };
    } else {
      this.lastBar = {
        time: currentCandleTime,
        open: this.lastBar.close,
        close: averagePriceValue,
        high: Math.max(this.lastBar.close, averagePriceValue),
        low: Math.min(this.lastBar.close, averagePriceValue),
        ticker,
      };

      return this.lastBar;
    }
  }
}
