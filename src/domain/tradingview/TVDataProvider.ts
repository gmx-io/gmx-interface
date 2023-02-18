import { LAST_BAR_REFRESH_INTERVAL, SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { getLimitChartPricesFromStats, getStablePriceData, timezoneOffset } from "domain/prices";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { Bar } from "./types";
import { formatTimeInBar } from "./utils";
import { getCurrentPriceOfToken, getTokenChartPrice } from "./requests";
import { BigNumberish } from "ethers";

export class TVDataProvider {
  lastBar: Bar | null;
  startTime: number;
  lastTicker: string;
  lastPeriod: string;

  constructor() {
    this.lastBar = null;
    this.startTime = 0;
    this.lastTicker = "";
    this.lastPeriod = "";
  }

  async getCurrentPriceOfToken(chainId: number, ticker: string): Promise<BigNumberish> {
    return getCurrentPriceOfToken(chainId, ticker);
  }

  async getTokenHistoryBars(chainId: number, ticker: string, period: string): Promise<Bar[]> {
    return getTokenChartPrice(chainId, ticker, period);
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

  async getHistoryBars(chainId: number, ticker: string, resolution: string, isStable: boolean, countBack: number) {
    const period = SUPPORTED_RESOLUTIONS[resolution];
    try {
      const bars = isStable
        ? getStablePriceData(period, countBack)
        : await this.getTokenHistoryBars(chainId, ticker, period);

      return bars.map(formatTimeInBar);
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
