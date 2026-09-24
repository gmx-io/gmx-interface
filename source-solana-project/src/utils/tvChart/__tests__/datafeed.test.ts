let mockGmw391Enabled = true;
let mockGmw395Enabled = true;
let mockRealtimeMidPrice: number | undefined;
let mockSocketPrice: number | undefined;
let mockAlwaysOpenSymbol = false;
const mockSocketStoreSubscribe = jest.fn(() => jest.fn());

jest.mock('@/config/constants', () => ({
  USD_DECIMALS: 30,
}));
jest.mock('@/config/program', () => ({
  isAlwaysOpenTokenBySymbol: () => mockAlwaysOpenSymbol,
}));
jest.mock('@/config/featureFlagEnable', () => ({
  getGmw334Enabled: () => true,
  getGmw383Enabled: () => false,
  getGmw391Enabled: () => mockGmw391Enabled,
  getGmw395Enabled: () => mockGmw395Enabled,
}));
jest.mock('@/selectors/chart/selectSwapChartToken', () => ({
  selectSwapChartToken: () => undefined,
}));
jest.mock('@/utils/keeper/priceAdapter', () => ({
  candlePriceToNumber: Number,
  getKeeperTokenAddress: () => '',
  isKeeperCandleTokenBySymbol: () => false,
  resolutionToSeconds: () => 60,
  shouldFilterCandleMarketHoursBySymbol: () => false,
}));
jest.mock('@/utils/keeper/priceCandleWsClient', () => ({
  disposePriceCandleWsClient: jest.fn(),
  getPriceCandleWsClient: jest.fn(),
}));
jest.mock('@/utils/market/getMarketMidPrice', () => ({
  getMarketMidPrice: () =>
    mockRealtimeMidPrice === undefined ? undefined : {},
}));
jest.mock('@/utils/legacy', () => ({
  convertToFixedDecimal: () => mockRealtimeMidPrice,
}));
jest.mock('@/utils/tvChart/dataProvider', () => ({
  GMXDataProvider: class {
    fetchCandles = jest.fn().mockResolvedValue([]);
  },
}));
jest.mock('@/utils/tvChart/marketOpenFilter', () => ({
  MarketOpenFilter: class {
    clearCache = jest.fn();
    filterBarsByMarketHours = (bars: unknown[]) => bars;
    isMarketOpenAt = () => true;
    setTokenType = jest.fn();
  },
}));
jest.mock('@/zustand/useAppStore', () => ({
  useAppStore: {
    getState: () => ({
      indexTokens: { indexToken: 'token' },
      swap: { selectSwapReceiveToken: { tokenAddress: 'token' } },
      tickersState: { tokenPriceMap: new Map() },
      TradeboxNew: { marketDirection: 'Long' },
    }),
  },
}));
jest.mock('@/zustand/socketStore', () => ({
  __esModule: true,
  default: { subscribe: mockSocketStoreSubscribe },
  getLatestSocketPriceUsd: () => mockSocketPrice,
}));
jest.mock('@/zustand/wsLastUpdatedAtStore', () => ({
  useWsLastUpdatedAtStore: { getState: () => ({ setWsLastUpdatedAt: jest.fn() }) },
}));

import type { LibrarySymbolInfo } from '../../../../public/charting_library';
import { Datafeed } from '../datafeed';
import type { FormattedCandle } from '../dataProvider';

type DatafeedInternals = {
  subscribers: Record<string, Map<string, unknown>>;
  lastBar: Record<string, FormattedCandle>;
  lastBarTime: Record<string, number>;
  lastRealTimePrice: Record<string, number>;
  lastRealTimePriceAt: Record<string, number>;
  lastFinalizedApiBarTime: Record<string, number>;
  dataProvider: {
    fetchCandles: jest.Mock<Promise<FormattedCandle[]>>;
  };
  fetchAndUpdateBars: (
    symbol: string,
    period: string,
    key: string
  ) => Promise<void>;
  updateRealtimePrice: (
    key: string,
    chartToken: { symbol: string; prices: Record<string, unknown> },
    resolution?: string,
    socketPrice?: number
  ) => void;
};

const symbolInfo = { name: 'SOL/USD' } as LibrarySymbolInfo;

describe('Datafeed subscription lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGmw391Enabled = true;
    mockGmw395Enabled = true;
    mockRealtimeMidPrice = undefined;
    mockSocketPrice = undefined;
    mockAlwaysOpenSymbol = false;
    mockSocketStoreSubscribe.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('releases every subscriber and timer during full cleanup', () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();

    datafeed.subscribeBars(symbolInfo, '1', callback, 'subscriber-1');
    datafeed.subscribeBars(symbolInfo, '1', callback, 'subscriber-2');
    jest.advanceTimersByTime(100);

    const internals = datafeed as unknown as DatafeedInternals;
    expect(internals.subscribers['SOL-1m'].size).toBe(2);

    datafeed.unsubscribeAllBars();

    expect(internals.subscribers).toEqual({});
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels a pending setup before replacing the same stream', () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();

    datafeed.subscribeBars(symbolInfo, '1', callback, 'subscriber-1');
    datafeed.subscribeBars(symbolInfo, '1', callback, 'subscriber-2');
    jest.advanceTimersByTime(100);

    expect(jest.getTimerCount()).toBe(2);

    datafeed.unsubscribeAllBars();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps a shared stream alive until its last TradingView subscriber leaves', () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;

    datafeed.subscribeBars(symbolInfo, '1', callback, 'subscriber-1');
    datafeed.subscribeBars(symbolInfo, '1', callback, 'subscriber-2');
    jest.advanceTimersByTime(100);

    datafeed.unsubscribeBars('subscriber-1');
    expect(internals.subscribers['SOL-1m'].size).toBe(1);
    expect(jest.getTimerCount()).toBe(2);

    datafeed.unsubscribeBars('subscriber-2');
    expect(internals.subscribers).toEqual({});
    expect(jest.getTimerCount()).toBe(0);
  });

  it('publishes polling updates for the current candle', async () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const updatedBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 0,
    };

    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBarTime[key] = updatedBar.time;
    internals.dataProvider.fetchCandles.mockResolvedValue([updatedBar]);

    await internals.fetchAndUpdateBars('SOL', '1m', key);

    expect(callback).toHaveBeenCalledWith(updatedBar);
    expect(internals.lastBar[key]).toEqual(updatedBar);
    expect(internals.lastBarTime[key]).toBe(updatedBar.time);
  });

  it.each(['XAG', 'WTI', 'XPT', 'XPD'])(
    'does not publish the current %s polling candle before a realtime price arrives',
    async (symbol) => {
      const datafeed = new Datafeed();
      const callback = jest.fn();
      const internals = datafeed as unknown as DatafeedInternals;
      const key = `${symbol}-1m`;
      const currentBar: FormattedCandle = {
        time: 60_000,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 0,
      };

      jest.setSystemTime(75_000);
      mockAlwaysOpenSymbol = true;
      internals.subscribers[key] = new Map([['subscriber-1', callback]]);
      internals.dataProvider.fetchCandles.mockResolvedValue([currentBar]);

      await internals.fetchAndUpdateBars(symbol, '1m', key);

      expect(callback).not.toHaveBeenCalled();
      expect(internals.lastBar[key]).toBeUndefined();
    }
  );

  it('merges polling data without rolling back the current candle', async () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const currentBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 112,
      low: 95,
      close: 110,
      volume: 0,
    };
    const pollingBar: FormattedCandle = {
      time: 60_000,
      open: 98,
      high: 108,
      low: 97,
      close: 102,
      volume: 0,
    };

    jest.setSystemTime(75_000);
    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = currentBar;
    internals.lastBarTime[key] = currentBar.time;
    internals.lastRealTimePrice[key] = currentBar.close;
    internals.lastRealTimePriceAt[key] = Date.now();
    internals.dataProvider.fetchCandles.mockResolvedValue([pollingBar]);

    await internals.fetchAndUpdateBars('SOL', '1m', key);

    const expectedBar = {
      ...currentBar,
      high: 112,
      low: 95,
      close: 110,
    };
    expect(callback).toHaveBeenCalledWith(expectedBar);
    expect(internals.lastBar[key]).toEqual(expectedBar);
  });

  it('uses API OHLC unchanged when polling finalizes a historical candle', async () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const currentBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 112,
      low: 95,
      close: 110,
      volume: 0,
    };
    const pollingBar: FormattedCandle = {
      time: 120_000,
      open: 105,
      high: 108,
      low: 103,
      close: 106,
      volume: 0,
    };

    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = currentBar;
    internals.lastBarTime[key] = currentBar.time;
    internals.dataProvider.fetchCandles.mockResolvedValue([pollingBar]);
    jest.setSystemTime(180_000);

    await internals.fetchAndUpdateBars('SOL', '1m', key);

    expect(callback).toHaveBeenCalledWith(pollingBar);
    expect(internals.lastBar[key]).toEqual(pollingBar);
  });

  it('keeps the existing merge behavior for the current candle', async () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const previousBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 112,
      low: 95,
      close: 110,
      volume: 0,
    };
    const currentApiBar: FormattedCandle = {
      time: 120_000,
      open: 105,
      high: 108,
      low: 103,
      close: 106,
      volume: 0,
    };

    jest.setSystemTime(135_000);
    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = previousBar;
    internals.lastBarTime[key] = previousBar.time;
    internals.dataProvider.fetchCandles.mockResolvedValue([currentApiBar]);

    await internals.fetchAndUpdateBars('SOL', '1m', key);

    const expectedBar = {
      ...currentApiBar,
      open: 110,
      high: 110,
      low: 103,
    };
    expect(callback).toHaveBeenCalledWith(expectedBar);
    expect(internals.lastBar[key]).toEqual(expectedBar);
  });

  it('publishes API history before the current candle', async () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const finalizedApiBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 108,
      low: 99,
      close: 106,
      volume: 0,
    };
    const currentApiBar: FormattedCandle = {
      time: 120_000,
      open: 106,
      high: 109,
      low: 105,
      close: 108,
      volume: 0,
    };

    jest.setSystemTime(135_000);
    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = {
      ...finalizedApiBar,
      open: 99,
      high: 110,
      close: 109,
    };
    internals.lastBarTime[key] = finalizedApiBar.time;
    internals.dataProvider.fetchCandles.mockResolvedValue([
      finalizedApiBar,
      currentApiBar,
    ]);

    await internals.fetchAndUpdateBars('SOL', '1m', key);

    expect(callback.mock.calls[0][0]).toEqual(finalizedApiBar);
    expect(callback.mock.calls[1][0]).toEqual({
      ...currentApiBar,
      open: finalizedApiBar.close,
      high: Math.max(finalizedApiBar.close, currentApiBar.high),
      low: Math.min(finalizedApiBar.close, currentApiBar.low),
    });
  });

  it('creates the next candle after the previous one is finalized by the API', () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const previousBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      volume: 0,
    };

    jest.setSystemTime(120_001);
    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = previousBar;
    internals.lastBarTime[key] = previousBar.time;

    internals.updateRealtimePrice(
      key,
      { symbol: 'SOL', prices: {} },
      '1',
      106
    );
    expect(callback).not.toHaveBeenCalled();

    internals.lastFinalizedApiBarTime[key] = previousBar.time;
    internals.updateRealtimePrice(
      key,
      { symbol: 'SOL', prices: {} },
      '1',
      106
    );

    expect(callback).toHaveBeenCalledWith({
      time: 120_000,
      open: previousBar.close,
      high: 106,
      low: 106,
      close: 106,
      volume: 0,
    });
  });

  it('keeps the latest realtime close when its value has not changed', async () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const currentBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 110,
      low: 95,
      close: 108,
      volume: 0,
    };
    const pollingBar: FormattedCandle = {
      time: 60_000,
      open: 99,
      high: 112,
      low: 97,
      close: 105,
      volume: 0,
    };

    jest.setSystemTime(75_000);
    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = currentBar;
    internals.lastBarTime[key] = currentBar.time;
    internals.lastRealTimePrice[key] = currentBar.close;
    internals.lastRealTimePriceAt[key] = Date.now() - 15_001;
    internals.dataProvider.fetchCandles.mockResolvedValue([pollingBar]);

    await internals.fetchAndUpdateBars('SOL', '1m', key);

    const expectedBar = {
      ...currentBar,
      high: 112,
      low: 95,
      close: 108,
    };
    expect(callback).toHaveBeenCalledWith(expectedBar);
    expect(internals.lastBar[key]).toEqual(expectedBar);
  });

  it('continues publishing an unchanged realtime price after 15 seconds', async () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const currentBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 110,
      low: 95,
      close: 108,
      volume: 0,
    };
    const pollingBar: FormattedCandle = {
      time: 60_000,
      open: 99,
      high: 112,
      low: 97,
      close: 105,
      volume: 0,
    };

    jest.setSystemTime(75_001);
    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = currentBar;
    internals.lastBarTime[key] = currentBar.time;
    internals.lastRealTimePrice[key] = currentBar.close;
    internals.lastRealTimePriceAt[key] = 60_000;
    internals.dataProvider.fetchCandles.mockResolvedValue([pollingBar]);

    await internals.fetchAndUpdateBars('SOL', '1m', key);
    callback.mockClear();
    mockRealtimeMidPrice = currentBar.close;
    internals.updateRealtimePrice(
      key,
      { symbol: 'SOL', prices: {} },
      '1'
    );

    expect(callback).toHaveBeenCalledWith({
      ...currentBar,
      high: 112,
      low: 95,
    });
    expect(internals.lastBar[key].close).toBe(currentBar.close);
    expect(internals.lastRealTimePriceAt[key]).toBe(75_001);
  });

  it('uses the raw socket price instead of the derived ticker price', () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'XAU-1h';

    jest.setSystemTime(3_600_001);
    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = {
      time: 3_600_000,
      open: 4376.56,
      high: 4376.56,
      low: 4376.56,
      close: 4376.56,
      volume: 0,
    };
    internals.lastBarTime[key] = 3_600_000;
    mockRealtimeMidPrice = 4376.56;

    internals.updateRealtimePrice(
      key,
      { symbol: 'XAU', prices: {} },
      '60',
      4377.06
    );

    expect(callback).toHaveBeenCalledWith({
      time: 3_600_000,
      open: 4376.56,
      high: 4377.06,
      low: 4376.56,
      close: 4377.06,
      volume: 0,
    });
    expect(internals.lastRealTimePrice[key]).toBe(4377.06);
  });

  it('resumes realtime updates when a stale price changes', () => {
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';

    jest.setSystemTime(75_001);
    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = {
      time: 60_000,
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      volume: 0,
    };
    internals.lastBarTime[key] = 60_000;
    internals.lastRealTimePrice[key] = 108;
    internals.lastRealTimePriceAt[key] = 60_000;
    mockRealtimeMidPrice = 109;

    internals.updateRealtimePrice(
      key,
      { symbol: 'SOL', prices: {} },
      '1'
    );

    expect(callback).toHaveBeenCalledWith({
      time: 60_000,
      open: 100,
      high: 110,
      low: 95,
      close: 109,
      volume: 0,
    });
    expect(internals.lastRealTimePrice[key]).toBe(109);
    expect(internals.lastRealTimePriceAt[key]).toBe(75_001);
  });

  it('keeps the pre-GMW-395 polling behavior when the flag is disabled', async () => {
    mockGmw395Enabled = false;
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const currentBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 112,
      low: 95,
      close: 110,
      volume: 0,
    };
    const pollingBar: FormattedCandle = {
      time: 60_000,
      open: 98,
      high: 108,
      low: 97,
      close: 102,
      volume: 0,
    };

    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBar[key] = currentBar;
    internals.lastBarTime[key] = currentBar.time;
    internals.dataProvider.fetchCandles.mockResolvedValue([pollingBar]);

    await internals.fetchAndUpdateBars('SOL', '1m', key);

    expect(callback).toHaveBeenCalledWith(pollingBar);
    expect(internals.lastBar[key]).toEqual(pollingBar);
  });

  it('keeps the legacy polling behavior when GMW-391 is disabled', async () => {
    mockGmw391Enabled = false;
    const datafeed = new Datafeed();
    const callback = jest.fn();
    const internals = datafeed as unknown as DatafeedInternals;
    const key = 'SOL-1m';
    const updatedBar: FormattedCandle = {
      time: 60_000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 0,
    };

    jest.setSystemTime(75_000);
    internals.subscribers[key] = new Map([['subscriber-1', callback]]);
    internals.lastBarTime[key] = updatedBar.time;
    internals.dataProvider.fetchCandles.mockResolvedValue([updatedBar]);

    await internals.fetchAndUpdateBars('SOL', '1m', key);

    expect(callback).not.toHaveBeenCalled();
    expect(internals.lastBar[key]).toBeUndefined();
    expect(internals.lastBarTime[key]).toBe(updatedBar.time);
  });
});
