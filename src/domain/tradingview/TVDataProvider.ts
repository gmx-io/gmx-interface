import { LAST_BAR_FETCH_INTERVAL } from "config/tradingview";
import { getLimitChartPricesFromStats, TIMEZONE_OFFSET_SEC } from "domain/prices";
import { CHART_PERIODS } from "lib/legacy";
import { Bar, FromOldToNewArray } from "./types";
import { formatTimeInBarToMs, getCurrentCandleTime, getMax, getMin } from "./utils";
import { fillBarGaps, getStableCoinPrice, getTokenChartPrice } from "./requests";
import { PeriodParams } from "charting_library";

const initialState = {
  chainId: null,
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

    const lastBar = prices[0];

    if (lastBar.ticker !== this.currentTicker || lastBar.period !== this.currentPeriod) {
      return;
    }

    lastBar.ticker = this.currentTicker;
    lastBar.period = this.currentPeriod;

    const lastSavedBar = this.liveBars[this.liveBars.length - 1];

    if (lastSavedBar && lastBar.time !== lastSavedBar?.time) {
      this.liveBars.push(lastBar);
      this.liveBars[0].close = this.liveBars[1].open;
    } else {
      this.liveBars = [lastBar];
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
        this.liveBars = [];

        const bars = await this.getTokenChartPrice(chainId, ticker, period);
        const filledBars = fillBarGaps(bars, CHART_PERIODS[period]);
        const lastBar = bars[bars.length - 1];

        if (lastBar) {
          this.liveBars = [{ ...lastBar, ticker, period }];
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
        this.liveBars = bars.slice(-1);
      }

      return bars.filter((bar) => bar.time >= from).sort((a, b) => a.time - b.time) as FromOldToNewArray<Bar>;
    }
  }

  getLiveBars(chainId: number, ticker: string, period: string): Bar[] {
    if (!ticker || !period || !chainId) return [];

    const barsInfo = this.barsInfo;
    const lastBar = this.liveBars[this.liveBars.length - 1];

    if (
      !lastBar ||
      !this.chartTokenInfo?.isChartReady ||
      barsInfo.ticker !== lastBar.ticker ||
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

  setCurrentChartToken(chartTokenInfo: { price: number; ticker: string; isChartReady: boolean }) {
    this.chartTokenInfo = chartTokenInfo;

    const lastBar = this.liveBars[this.liveBars.length - 1];

    if (lastBar) {
      lastBar.close = chartTokenInfo.price;
      lastBar.high = getMax(lastBar.open, lastBar.high, this.currentPrice);
      lastBar.low = getMin(lastBar.open, lastBar.low, this.currentPrice);
    }
  }

  setChainId(chainId: number) {
    this.chainId = chainId;
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
