import { USD_DECIMALS } from '@/config/constants';
import { isAlwaysOpenTokenBySymbol } from '@/config/program';
import {
  getGmw334Enabled,
  getGmw383Enabled,
  getGmw391Enabled,
  getGmw395Enabled,
} from '@/config/featureFlagEnable';
import { selectSwapChartToken } from '@/selectors/chart/selectSwapChartToken';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';
import { useAppStore } from '@/zustand/useAppStore';
import useSocketStore, {
  getLatestSocketPriceUsd,
} from '@/zustand/socketStore';
import { useWsLastUpdatedAtStore } from '@/zustand/wsLastUpdatedAtStore';
import { BN } from "@coral-xyz/anchor";

import {
  DatafeedConfiguration as TVDatafeedConfiguration,
  IBasicDataFeed,
  LibrarySymbolInfo,
  ResolutionString,
  SearchSymbolsCallback,
} from '../../../public/charting_library';
import { GMXDataProvider } from './dataProvider';
import { MarketOpenFilter } from './marketOpenFilter';
import { convertToFixedDecimal } from '../legacy';

import type { FormattedCandle } from './dataProvider';
import type { TokenData, TokenType } from '@/selectors/token/types';

import {
  isKeeperCandleTokenBySymbol,
  getKeeperTokenAddress,
  candlePriceToNumber,
  resolutionToSeconds,
  shouldFilterCandleMarketHoursBySymbol,
} from '@/utils/keeper/priceAdapter';
import { getPriceCandleWsClient, disposePriceCandleWsClient } from '@/utils/keeper/priceCandleWsClient';
import { print } from 'graphql';
import { gql } from '@apollo/client';

const SUPPORTED_RESOLUTIONS: ResolutionString[] = [
  '1' as ResolutionString,
  '5' as ResolutionString,
  '15' as ResolutionString,
  '60' as ResolutionString,
  '240' as ResolutionString,
  '1D' as ResolutionString,
  '1W' as ResolutionString,
  '1M' as ResolutionString,
];

const RESOLUTION_INTERVAL_MAP: Record<string, number> = {
  '1': 60,
  '5': 300,
  '15': 900,
  '60': 3600,
  '120': 7200,
  '240': 14400,
  '1D': 86400,
  '1W': 604800,
  '1M': 2592000,
};

const RESOLUTION_TO_GMX_PERIOD_MAP: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '60': '1h',
  '120': '2h',
  '240': '4h',
  '1D': '1d',
  '1W': '1d', // Backend does not support weekly; fall back to daily data
  '1M': '1d', // Backend does not support monthly; fall back to daily data
};

const PERIOD_TO_RESOLUTION_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '2h': '120',
  '4h': '240',
  '1d': '1D',
  '1w': '1W',
  '1M': '1M',
};

const CANDLE_UPDATE_SUBSCRIPTION = gql`
  subscription CandleUpdate($indexToken: String, $resolution: Int) {
    candleUpdate(indexToken: $indexToken, resolution: $resolution) {
      indexToken
      resolution
      timestamp
      open
      high
      low
      close
    }
  }
`;

interface PeriodParams {
  from: number;
  to: number;
  countBack?: number;
  firstDataRequest?: boolean;
}

type HistoryCallback = (
  bars: FormattedCandle[],
  meta?: { noData?: boolean }
) => void;
type ErrorCallback = (error: string) => void;

export class Datafeed implements IBasicDataFeed {
  private dataProvider: GMXDataProvider;
  private tokenType: TokenType = 'crypto';
  private marketOpenFilter: MarketOpenFilter;
  private lastBarTime: Record<string, number> = {};
  private lastRealTimePrice: Record<string, number> = {};
  private lastRealTimePriceAt: Record<string, number> = {};
  private lastBar: Record<string, FormattedCandle> = {};
  private subscribers: Record<
    string,
    Map<string, (bar: FormattedCandle) => void>
  > = {};
  private lastFinalizedApiBarTime: Record<string, number> = {};
  private updateInterval: Record<string, NodeJS.Timeout> = {};
  private priceUpdateInterval: Record<string, NodeJS.Timeout> = {};
  private setupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private initLimit: number = 1000;
  private limitMax: number = 5000;
  private keeperSubscriptionCleanups: Record<string, () => void> = {};
  private priceSubscriptionCleanups: Record<string, () => void> = {};

  constructor(tokenType: TokenType = 'crypto') {
    this.dataProvider = new GMXDataProvider();
    this.tokenType = tokenType;
    this.marketOpenFilter = new MarketOpenFilter(tokenType);
  }

  setTokenType(tokenType: TokenType): void {
    this.tokenType = tokenType || 'crypto';
    this.marketOpenFilter.setTokenType(this.tokenType);
  }

  onReady(callback: (configuration: TVDatafeedConfiguration) => void): void {
    setTimeout(() =>
      callback({
        supported_resolutions: SUPPORTED_RESOLUTIONS,
        supports_time: true,
        supports_marks: false,
        supports_timescale_marks: false,
      })
    );
  }

  async getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onHistoryCallback: HistoryCallback,
    onErrorCallback: ErrorCallback
  ): Promise<void> {
    const period = RESOLUTION_TO_GMX_PERIOD_MAP[resolution] || '1h';
    const symbol = symbolInfo.name.split('/')[0].replace(/[^\w]/g, '').trim();
    const { from, to } = periodParams;
    const range = this.buildHistoryRange(from, to, resolution, periodParams.countBack);

    try {
      let bars = await this.tryFetchWithAdaptiveLimit(
        symbol,
        period,
        resolution,
        range.from,
        range.to
      );

      if (
        !bars.length &&
        this.tokenType !== 'crypto' &&
        shouldFilterCandleMarketHoursBySymbol(symbol) &&
        !this.marketOpenFilter.isMarketOpenAt(range.to * 1000, {
          enforceIntradaySession: this.isIntradayResolution(resolution),
        })
      ) {
        const fallbackRange = this.buildClosedMarketFallbackRange(
          range.to,
          resolution,
          periodParams.countBack
        );
        bars = await this.tryFetchWithAdaptiveLimit(
          symbol,
          period,
          resolution,
          fallbackRange.from,
          fallbackRange.to
        );
      }

      if (!bars || bars.length === 0) {
        onHistoryCallback([], { noData: true });
        return;
      }

      if (isAlwaysOpenTokenBySymbol(symbol)) {
        const secondsPerBar = RESOLUTION_INTERVAL_MAP[resolution] || 60;
        const currentBarTime =
          Math.floor(Date.now() / 1000 / secondsPerBar) *
          secondsPerBar *
          1000;
        const lastBar = bars[bars.length - 1];
        if (lastBar.time === currentBarTime) {
          const socketPrice = getLatestSocketPriceUsd(symbol);
          bars = socketPrice
            ? [
                ...bars.slice(0, -1),
                {
                  ...lastBar,
                  high: Math.max(lastBar.high, socketPrice),
                  low: Math.min(lastBar.low, socketPrice),
                  close: socketPrice,
                },
              ]
            : bars.slice(0, -1);
        }
      }

      if (bars.length === 0) {
        onHistoryCallback([], { noData: true });
        return;
      }

      const key = `${symbol}-${period}`;
      const secondsPerBar = RESOLUTION_INTERVAL_MAP[resolution] || 60;
      const currentBarTime =
        Math.floor(Date.now() / 1000 / secondsPerBar) *
        secondsPerBar *
        1000;
      const latestHistoryBar = this.findLatestHistoryBar(
        bars,
        currentBarTime
      );
      if (latestHistoryBar) {
        this.lastFinalizedApiBarTime[key] = latestHistoryBar.time;
      }
      const curLastBar = bars[bars.length - 1];
      if (!this.lastBar[key]) {
        this.lastBar[key] = curLastBar;
      } else if (curLastBar.time >= this.lastBar[key].time) {
        this.lastBar[key] = curLastBar;
      }
      onHistoryCallback(bars);
    } catch (error) {
      console.error('getBars error:', error);
      onErrorCallback(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private buildHistoryRange(
    from: number,
    to: number,
    resolution: string,
    countBack?: number
  ): { from: number; to: number } {
    const nowSec = Math.floor(Date.now() / 1000);
    const toSec = Number.isFinite(to) && to > 0 ? Math.min(to, nowSec) : nowSec;
    const fromSec =
      Number.isFinite(from) && from > 0 && from < toSec
        ? from
        : Math.max(
            0,
            toSec -
              (RESOLUTION_INTERVAL_MAP[resolution] || 60) *
                Math.max(countBack ?? 300, 50)
          );

    return { from: fromSec, to: toSec };
  }

  private buildClosedMarketFallbackRange(
    to: number,
    resolution: string,
    countBack?: number
  ): { from: number; to: number } {
    const baseLookbackSeconds =
      (RESOLUTION_INTERVAL_MAP[resolution] || 60) * Math.max(countBack ?? 500, 500);
    const minClosedLookbackSeconds = 7 * 24 * 60 * 60;
    const lookbackSeconds = Math.max(baseLookbackSeconds, minClosedLookbackSeconds);

    return {
      from: Math.max(0, to - lookbackSeconds),
      to,
    };
  }

  private async tryFetchWithAdaptiveLimit(
    symbol: string,
    period: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<FormattedCandle[]> {
    let limit = this.initLimit;
    let lastResult: FormattedCandle[] = [];

    while (limit <= this.limitMax) {
      let result = await this.dataProvider.fetchCandles(
        symbol,
        period,
        from,
        to,
        limit
      );

      if (shouldFilterCandleMarketHoursBySymbol(symbol)) {
        result = this.marketOpenFilter.filterBarsByMarketHours(result || [], {
          enforceIntradaySession: this.isIntradayResolution(resolution),
          barDurationSeconds: RESOLUTION_INTERVAL_MAP[resolution] || 60,
        });
      }

      if (result && result.length > 0) {
        return result;
      }
      lastResult = result || [];
      limit += 1000;
    }

    return lastResult;
  }

  private isIntradayResolution(resolution: string): boolean {
    return resolution !== '1D' && resolution !== '1W' && resolution !== '1M';
  }

  private findLatestHistoryBar(
    bars: FormattedCandle[],
    currentBarTime: number
  ): FormattedCandle | undefined {
    for (let index = bars.length - 1; index >= 0; index -= 1) {
      if (bars[index].time < currentBarTime) return bars[index];
    }
    return undefined;
  }

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: FormattedCandle) => void,
    subscriberUID: string
  ): void {

    const symbol = symbolInfo.name.split('/')[0].replace(/[^\w]/g, '').trim();
    const period = RESOLUTION_TO_GMX_PERIOD_MAP[resolution] || '1h';
    const key = `${symbol}-${period}`;

    if (!this.subscribers[key]) {
      this.subscribers[key] = new Map();
    }
    this.subscribers[key].set(subscriberUID, onRealtimeCallback);

    // Clear existing timers
    if (getGmw334Enabled()) {
      const pendingSetupTimer = this.setupTimers.get(key);
      if (pendingSetupTimer !== undefined) {
        clearTimeout(pendingSetupTimer);
        this.setupTimers.delete(key);
      }
    }
    if (this.updateInterval[key]) {
      clearInterval(this.updateInterval[key]);
    }
    if (this.priceUpdateInterval[key]) {
      clearInterval(this.priceUpdateInterval[key]);
    }
    // Clean up existing keeper subscription
    if (this.keeperSubscriptionCleanups[key]) {
      this.keeperSubscriptionCleanups[key]();
      delete this.keeperSubscriptionCleanups[key];
    }
    if (this.priceSubscriptionCleanups[key]) {
      this.priceSubscriptionCleanups[key]();
      delete this.priceSubscriptionCleanups[key];
    }

    if (isKeeperCandleTokenBySymbol(symbol)) {
      // --- Keeper token: use price-candle subscription + candle polling ---
      const tokenAddress = getKeeperTokenAddress(symbol);
      const resolutionSeconds = resolutionToSeconds(resolution);

      // Poll candles every 10s as fallback / initial load
      const updateBars = () => {
        void this.fetchAndUpdateBars(symbol, period, key);
      };
      this.updateInterval[key] = setInterval(updateBars, 10000);
      updateBars();

      // Subscribe to real-time candle updates via WebSocket
      try {
        const client = getPriceCandleWsClient();
        let disposed = false;

        const cleanup = client.subscribe(
          {
            query: print(CANDLE_UPDATE_SUBSCRIPTION),
            variables: {
              indexToken: tokenAddress,
              resolution: resolutionSeconds,
            },
          },
          {
            next: (value: any) => {
              if (disposed) return;
              const candleData = value?.data?.candleUpdate;
              if (!candleData) return;
              useWsLastUpdatedAtStore
                .getState()
                .setWsLastUpdatedAt('priceCandle');
              // console.log('priceCandleLastUpdatedAt: ',useWsLastUpdatedAtStore.getState().priceCandleLastUpdatedAt);

              const bar: FormattedCandle = {
                time: candleData.timestamp * 1000,
                open: candlePriceToNumber(candleData.open),
                high: candlePriceToNumber(candleData.high),
                low: candlePriceToNumber(candleData.low),
                close: candlePriceToNumber(candleData.close),
                volume: 0,
              };

              const periodResolution = PERIOD_TO_RESOLUTION_MAP[period];
              const periodSeconds = RESOLUTION_INTERVAL_MAP[periodResolution] || 60;
              if (
                shouldFilterCandleMarketHoursBySymbol(symbol) &&
                !this.marketOpenFilter.isMarketOpenAt(bar.time, {
                  enforceIntradaySession: true,
                  barDurationSeconds: periodSeconds,
                })
              ) {
                return;
              }

              if (bar.time >= (this.lastBarTime[key] || 0)) {
                this.lastBar[key] = bar;
                this.lastBarTime[key] = bar.time;

                const subscribers = this.subscribers[key];
                if (subscribers) {
                  subscribers.forEach((callback) => callback(bar));
                }
              }
            },
            error: (err: any) => {
              console.error('[price-candle] Subscription error:', err);
            },
            complete: () => {
              console.log('[price-candle] Subscription complete');
            },
          }
        );

        this.keeperSubscriptionCleanups[key] = () => {
          disposed = true;
          cleanup();
        };
      } catch (err) {
        console.error('[price-candle] Failed to subscribe:', err);
      }
    } else {
      // --- Non-keeper token: existing polling logic ---
      // Update candle data every 10 seconds
      const updateBars = () => {
        void this.fetchAndUpdateBars(symbol, period, key);
      };
      this.updateInterval[key] = setInterval(updateBars, 10000);
      updateBars();

      // Update real-time price every second
      const updateRealtimePrice = () => {
        const state = useAppStore.getState();
        let indexToken = state.indexTokens.indexToken;
        const isSwap = state.TradeboxNew.marketDirection === 'Swap';
        const isGmw383Enabled = getGmw383Enabled();
        if (isSwap && isGmw383Enabled) {
          indexToken = selectSwapChartToken(state)?.tokenAddress ?? '';
        } else if (isSwap) {
          indexToken = state.swap.selectSwapReceiveToken.tokenAddress;
        }
        if (isSwap && isGmw383Enabled && !indexToken) return;

        const price = state.tickersState.tokenPriceMap.get(indexToken);
        const socketPrice = getLatestSocketPriceUsd(symbol);
        if (isSwap && isGmw383Enabled && !price?.price && !socketPrice) return;

        const chartToken = {
          symbol,
          prices: {
            minPrice: new BN(price?.price || 0),
            maxPrice: new BN(price?.price || 0),
          },
        } as TokenData;
        if (
          socketPrice ||
          (chartToken && chartToken.prices.minPrice.gt(new BN(0)))
        ) {
          void this.updateRealtimePrice(
            key,
            chartToken,
            resolution,
            socketPrice
          );
        }
      };
      const setupTimer = setTimeout(() => {
        this.setupTimers.delete(key);
        if (!this.subscribers[key]) return;
        this.subscribers[key].set(subscriberUID, onRealtimeCallback);
        this.priceUpdateInterval[key] = setInterval(updateRealtimePrice, 1000);
        updateRealtimePrice();
      }, 100);
      this.setupTimers.set(key, setupTimer);
      this.priceSubscriptionCleanups[key] = useSocketStore.subscribe(
        (state, previousState) => {
          if (state.tickers !== previousState.tickers) {
            updateRealtimePrice();
          }
        }
      );
    }
  }

  private async fetchAndUpdateBars(
    symbol: string,
    period: string,
    key: string
  ): Promise<void> {
    try {
      const bars = await this.dataProvider.fetchCandles(
        symbol,
        period,
        Math.floor(Date.now() / 1000) - 300,
        Math.floor(Date.now() / 1000)
      );

      if (bars && bars.length > 0) {
        const lastBar = bars[bars.length - 1];
        const periodResolution = PERIOD_TO_RESOLUTION_MAP[period];
        const periodSeconds = RESOLUTION_INTERVAL_MAP[periodResolution] || 60;
        const currentBarTime =
          Math.floor(Date.now() / 1000 / periodSeconds) *
          periodSeconds *
          1000;
        const latestHistoryBar = this.findLatestHistoryBar(
          bars,
          currentBarTime
        );
        if (latestHistoryBar) {
          this.lastFinalizedApiBarTime[key] = latestHistoryBar.time;
          if (latestHistoryBar.time >= (this.lastBarTime[key] || 0)) {
            this.lastBar[key] = latestHistoryBar;
            this.lastBarTime[key] = latestHistoryBar.time;
            this.subscribers[key]?.forEach((callback) =>
              callback(latestHistoryBar)
            );
          }
        }
        if (
          isAlwaysOpenTokenBySymbol(symbol) &&
          lastBar.time === currentBarTime &&
          !Number.isFinite(this.lastRealTimePrice[key])
        ) {
          return;
        }
        if (
          shouldFilterCandleMarketHoursBySymbol(symbol) &&
          !this.marketOpenFilter.isMarketOpenAt(lastBar.time, {
            enforceIntradaySession: true,
            barDurationSeconds: periodSeconds,
          })
        ) {
          return;
        }

        const isGmw391Enabled = getGmw391Enabled();
        const isCurrentCandle = lastBar.time === currentBarTime;
        const shouldPublish =
          lastBar.time !== latestHistoryBar?.time &&
          (isGmw391Enabled || !isCurrentCandle
            ? lastBar.time >= (this.lastBarTime[key] || 0)
            : lastBar.time > (this.lastBarTime[key] || 0));
        if (shouldPublish) {
          let barToPublish = lastBar;
          if (isGmw391Enabled) {
            if (getGmw395Enabled()) {
              const currentBar = this.lastBar[key];
              if (currentBar?.time === lastBar.time && isCurrentCandle) {
                const realtimePrice = this.lastRealTimePrice[key];
                const close = Number.isFinite(realtimePrice)
                  ? realtimePrice
                  : lastBar.close;

                barToPublish = {
                  time: currentBar.time,
                  open: currentBar.open,
                  high: Math.max(currentBar.high, lastBar.high, close),
                  low: Math.min(currentBar.low, lastBar.low, close),
                  close,
                  volume: lastBar.volume,
                };
              } else if (
                currentBar &&
                isCurrentCandle &&
                lastBar.time - currentBar.time === periodSeconds * 1000
              ) {
                barToPublish = {
                  ...lastBar,
                  open: currentBar.close,
                  high: Math.max(currentBar.close, lastBar.high),
                  low: Math.min(currentBar.close, lastBar.low),
                };
              }
            }
          }
          this.lastBar[key] = barToPublish;
          this.lastBarTime[key] = barToPublish.time;
          const subscribers = this.subscribers[key];
          if (subscribers) {
            subscribers.forEach((callback) => callback(barToPublish));
          }
        }
      }
    } catch (error) {
      console.error('Error updating real-time data:', error);
    }
  }

  private updateRealtimePrice(
    key: string,
    chartToken: TokenData,
    resolution: string = '1',
    socketPrice?: number
  ): void {
    try {
      let midPrice = socketPrice;
      if (!Number.isFinite(midPrice)) {
        if (!chartToken?.prices) return;
        const midPriceBN = getMarketMidPrice(chartToken.prices);
        if (!midPriceBN) return;
        midPrice = Number(convertToFixedDecimal(midPriceBN, USD_DECIMALS));
      }
      if (midPrice === undefined || !Number.isFinite(midPrice) || midPrice <= 0) {
        return;
      }

      const isGmw395Enabled = getGmw395Enabled();
      const secondsPerBar = RESOLUTION_INTERVAL_MAP[resolution] || 60;
      const currentTimeSec = Math.floor(Date.now() / 1000);
      const alignedTime =
        Math.floor(currentTimeSec / secondsPerBar) * secondsPerBar * 1000;
      if (
        shouldFilterCandleMarketHoursBySymbol(chartToken.symbol) &&
        !this.marketOpenFilter.isMarketOpenAt(alignedTime, {
          enforceIntradaySession: true,
          barDurationSeconds: secondsPerBar,
        })
      ) {
        return;
      }

      const lastBar = this.lastBar[key];

      if (
        lastBar &&
        alignedTime > lastBar.time &&
        lastBar.time > (this.lastFinalizedApiBarTime[key] || 0)
      ) {
        return;
      }

      let updatedBar: FormattedCandle;
      if (lastBar && alignedTime > lastBar.time) {
        updatedBar = {
          time: alignedTime,
          open: lastBar?.close || midPrice,
          high: midPrice,
          low: midPrice,
          close: midPrice,
          volume: 0,
        };
      } else if (alignedTime === lastBar?.time) {
        updatedBar = {
          ...lastBar,
          high: Math.max(lastBar.high, midPrice),
          low: Math.min(lastBar.low, midPrice),
          close: midPrice,
        };
      }

      if (lastBar && alignedTime >= lastBar.time) {
        this.lastBar[key] = updatedBar;
        this.lastBarTime[key] = updatedBar.time;
        if (isGmw395Enabled) {
          this.lastRealTimePriceAt[key] = Date.now();
        }
        this.lastRealTimePrice[key] = midPrice;

        const subscribers = this.subscribers[key];
        if (subscribers) {
          subscribers.forEach((callback) => callback(updatedBar));
        }
      }
    } catch (error) {
      console.error('Error updating real-time price:', error);
    }
  }

  unsubscribeBars(subscriberUID: string): void {
    Object.keys(this.subscribers).forEach((key) => {
      const subscribers = this.subscribers[key];
      if (subscribers) {
        subscribers.delete(subscriberUID);
        if (subscribers.size === 0) {
          this.releaseSubscriberResources(key);
        }
      }
    });
  }

  unsubscribeAllBars(): void {
    Object.keys(this.subscribers).forEach((key) => {
      this.subscribers[key].clear();
      this.releaseSubscriberResources(key);
    });
  }

  private releaseSubscriberResources(key: string): void {
    if (this.keeperSubscriptionCleanups[key]) {
      this.keeperSubscriptionCleanups[key]();
      delete this.keeperSubscriptionCleanups[key];
    }
    if (this.priceSubscriptionCleanups[key]) {
      this.priceSubscriptionCleanups[key]();
      delete this.priceSubscriptionCleanups[key];
    }
    const setupTimer = this.setupTimers.get(key);
    if (setupTimer !== undefined) {
      clearTimeout(setupTimer);
      this.setupTimers.delete(key);
    }
    if (this.updateInterval[key]) {
      clearInterval(this.updateInterval[key]);
      delete this.updateInterval[key];
    }
    if (this.priceUpdateInterval[key]) {
      clearInterval(this.priceUpdateInterval[key]);
      delete this.priceUpdateInterval[key];
    }
    delete this.subscribers[key];
  }

  searchSymbols(
    _userInput: string,
    _exchange: string,
    _symbolType: string,
    onResult: SearchSymbolsCallback
  ): void {
    onResult([]);
  }

  public resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: LibrarySymbolInfo) => void,
    onErrorCallback: ErrorCallback
  ): void {
    requestAnimationFrame(() => {
      try {
        const symbolInfo: LibrarySymbolInfo = {
          name: symbolName,
          description: symbolName,
          type: 'crypto',
          session: '24x7',
          timezone: 'Etc/UTC',
          exchange: 'GMX',
          listed_exchange: 'GMX-Solana',
          format: 'price',
          minmov: 1,
          pricescale: 100000000,
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: false,
          supported_resolutions: SUPPORTED_RESOLUTIONS,
          volume_precision: 8,
          data_status: 'streaming',
        };

        onSymbolResolvedCallback(symbolInfo);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        onErrorCallback(errorMessage);
      }
    });
  }

  clearCache(): void {
    // Clear all internal state
    this.lastBarTime = {};
    this.lastRealTimePrice = {};
    this.lastRealTimePriceAt = {};
    this.lastFinalizedApiBarTime = {};
    if (getGmw334Enabled()) {
      this.lastBar = {};
    }
    this.marketOpenFilter.clearCache();

    // Cancel all pending setup timers first to prevent new intervals being created
    this.setupTimers.forEach((timer) => clearTimeout(timer));
    this.setupTimers.clear();

    // Clean up keeper subscriptions and dispose WS client
    Object.values(this.keeperSubscriptionCleanups).forEach((cleanup) => cleanup());
    this.keeperSubscriptionCleanups = {};
    void disposePriceCandleWsClient();

    // Clear all subscribers and their intervals
    Object.keys(this.subscribers).forEach((key) => {
      if (this.updateInterval[key]) {
        clearInterval(this.updateInterval[key]);
        delete this.updateInterval[key];
      }
      if (this.priceUpdateInterval[key]) {
        clearInterval(this.priceUpdateInterval[key]);
        delete this.priceUpdateInterval[key];
      }
      this.subscribers[key].clear();
      delete this.subscribers[key];
    });

    // Reset data provider
    this.dataProvider = new GMXDataProvider();
  }
}
