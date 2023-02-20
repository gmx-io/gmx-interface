import { LAST_BAR_REFRESH_INTERVAL, SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { getLimitChartPricesFromStats, getStablePriceData, timezoneOffset } from "domain/prices";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { Bar } from "./types";
import { formatTimeInBar } from "./utils";
import { fillBarGaps, getCurrentPriceOfToken, getTokenChartPrice } from "./requests";
import { BigNumberish } from "ethers";
import { PeriodParams } from "charting_library";

export class TVDataProvider {
  lastBar: Bar | null;
  startTime: number;
  lastTicker: string;
  lastPeriod: string;
  bars: Bar[] | null;
  barCount: number;

  constructor() {
    this.lastBar = null;
    this.startTime = 0;
    this.lastTicker = "";
    this.lastPeriod = "";
    this.bars = null;
    this.barCount = 0;
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
    const { from, to, countBack } = periodParams;
    this.barCount = this.barCount + countBack;
    const bars = this.bars ? this.bars : await getTokenChartPrice(chainId, ticker, period);
    const filledBars = fillBarGaps(bars, CHART_PERIODS[period]);
    if (!this.bars) {
      this.bars = filledBars;
    }
    const toWithOffset = to + timezoneOffset;
    const fromWithOffset = from + timezoneOffset;
    return filledBars.filter((bar) => bar.time > fromWithOffset && bar.time <= toWithOffset).map(formatTimeInBar);
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
