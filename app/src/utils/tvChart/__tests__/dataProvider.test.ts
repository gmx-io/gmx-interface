jest.mock('@/config/url', () => ({
  GMX_SOLANA_API_ENDPOINT: 'https://example.com',
  PRICE_CANDLE_GRAPHQL_ENDPOINT: 'https://example.com/graphql',
}));
jest.mock('@/config/featureFlagEnable', () => ({
  getGmw334Enabled: () => true,
}));
jest.mock('@/utils/keeper/priceAdapter', () => ({
  candlePriceToNumber: Number,
  getKeeperTokenAddress: () => '',
  isKeeperCandleTokenBySymbol: () => false,
}));

import { GMXDataProvider, type FormattedCandle } from '../dataProvider';

type DataProviderInternals = {
  cachedData: Map<string, FormattedCandle[]>;
  updateCache: (
    cacheKey: string,
    newData: FormattedCandle[],
    limit?: number
  ) => void;
};

const makeCandles = (start: number, count: number): FormattedCandle[] =>
  Array.from({ length: count }, (_, index) => ({
    time: start + index,
    open: index,
    high: index,
    low: index,
    close: index,
    volume: 0,
  }));

describe('GMXDataProvider cache bounds', () => {
  it('keeps only the newest 5000 candles per symbol and resolution', () => {
    const provider = new GMXDataProvider() as unknown as DataProviderInternals;

    provider.updateCache('SOL-1m', makeCandles(0, 4000));
    provider.updateCache('SOL-1m', makeCandles(4000, 4000));

    const cached = provider.cachedData.get('SOL-1m');
    expect(cached).toHaveLength(5000);
    expect(cached?.[0].time).toBe(3000);
    expect(cached?.at(-1)?.time).toBe(7999);
  });
});
