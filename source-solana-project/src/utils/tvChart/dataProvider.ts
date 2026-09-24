import {
  GMX_SOLANA_API_ENDPOINT,
  PRICE_CANDLE_GRAPHQL_ENDPOINT,
} from '@/config/url';
import { fetchWithTimeoutLog } from '@/utils/fetchWithTimeoutLog';
import { getGmw334Enabled } from '@/config/featureFlagEnable';
import {
  isKeeperCandleTokenBySymbol,
  getKeeperTokenAddress,
  candlePriceToNumber,
} from '@/utils/keeper/priceAdapter';

interface GmxCandle extends Array<number> {}

interface GmxApiResponse {
  period: string;
  candles: GmxCandle[];
}

export interface FormattedCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class GMXDataProvider {
  private cachedData: Map<string, FormattedCandle[]> = new Map();
  private cachedLimit: Map<string, number> = new Map();
  private lastRequestTime: Map<string, number> = new Map();
  private pendingRequests: Map<string, Promise<FormattedCandle[]>> = new Map();
  private readonly CACHE_DURATION = 60000;
  private readonly MAX_RETRIES = 3;
  private readonly DEFAULT_LIMIT = 2000;
  private readonly MAX_CACHE_ENTRIES = 5000;

  private getCacheKey(symbol: string, period: string): string {
    return `${symbol}-${period}`;
  }

  public async fetchCandles(
    symbol: string,
    period: string,
    from?: number,
    to?: number,
    limit?: number
  ): Promise<FormattedCandle[]> {
    const cacheKey = this.getCacheKey(symbol, period);
    const cached = this.cachedData.get(cacheKey);

    if (this.canServeFromCache(cacheKey, cached, from, to, limit)) {
      return this.filterDataByTimeRange(cached!, from, to);
    }

    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      try {
        const result = await pendingRequest;
        if (this.canServeFromCache(cacheKey, result, from, to, limit)) {
          return this.filterDataByTimeRange(result, from, to);
        }
      } catch {
        this.pendingRequests.delete(cacheKey);
      }
    }

    // Route keeper candle tokens to the price-candle GraphQL API
    if (isKeeperCandleTokenBySymbol(symbol)) {
      const requestFrom = from ?? Math.floor(Date.now() / 1000) - 86400;
      const requestTo = to ?? Math.floor(Date.now() / 1000);
      const requestPromise = this.makeKeeperRequest(
        symbol,
        period,
        requestFrom,
        requestTo
      );
      this.pendingRequests.set(cacheKey, requestPromise);

      try {
        const result = await requestPromise;
        return this.filterDataByTimeRange(result, from, to);
      } catch (error) {
        console.error('fetchCandles (keeper) failed:', error);
        return cached ? this.filterDataByTimeRange(cached, from, to) : [];
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    }

    const targetLimit = Math.max(
      limit ?? 0,
      this.cachedLimit.get(cacheKey) ?? 0,
      this.DEFAULT_LIMIT
    );

    const requestPromise = this.makeRequest(symbol, period, 0, targetLimit);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return this.filterDataByTimeRange(result, from, to);
    } catch (error) {
      console.error('fetchCandles failed:', error);
      return cached ? this.filterDataByTimeRange(cached, from, to) : [];
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private canServeFromCache(
    cacheKey: string,
    data: FormattedCandle[] | undefined,
    from?: number,
    to?: number,
    limit?: number
  ): boolean {
    if (!data?.length) return false;

    const lastRequest = this.lastRequestTime.get(cacheKey) || 0;
    if (Date.now() - lastRequest >= this.CACHE_DURATION) return false;

    const cachedLimit = this.cachedLimit.get(cacheKey) || 0;
    if (limit && cachedLimit < limit) return false;

    if (!from || !to) return true;

    const cacheStartTime = data[0].time / 1000;
    const cacheEndTime = data[data.length - 1].time / 1000;
    return from >= cacheStartTime && to <= cacheEndTime;
  }

  private async makeRequest(
    symbol: string,
    period: string,
    retryCount = 0,
    limit?: number
  ): Promise<FormattedCandle[]> {
    const cacheKey = this.getCacheKey(symbol, period);
    const cleanSymbol = symbol.replace(/[/\s]/g, '').toUpperCase();
    const url = new URL(`${GMX_SOLANA_API_ENDPOINT}/v2/cache/prices/candles`);

    url.searchParams.append('tokenSymbol', cleanSymbol);
    url.searchParams.append('period', period);
    url.searchParams.append('limit', String(limit || this.DEFAULT_LIMIT));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetchWithTimeoutLog(url.toString(), {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('API error:', {
          status: response.status,
          response: text,
          symbol: cleanSymbol,
          url: url.toString(),
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Invalid response:', text);
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const data = (await response.json()) as GmxApiResponse;
      if (!data?.candles || !Array.isArray(data.candles)) {
        throw new Error('Invalid data format');
      }

      const candles = this.processCandles(data.candles);
      this.updateCache(cacheKey, candles, limit);
      return this.cachedData.get(cacheKey) || candles;
    } catch (error) {
      console.error('Request error:', {
        symbol: cleanSymbol,
        period,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (retryCount < this.MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1))
        );
        return this.makeRequest(symbol, period, retryCount + 1, limit);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private processCandles(candles: GmxCandle[]): FormattedCandle[] {
    return candles
      .sort((a, b) => a[0] - b[0])
      .map((candle) => ({
        time: candle[0] * 1000,
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: 0,
      }));
  }

  private updateCache(
    cacheKey: string,
    newData: FormattedCandle[],
    limit?: number
  ): void {
    const existingData = this.cachedData.get(cacheKey) || [];
    const combinedMap = new Map<number, FormattedCandle>();

    existingData.forEach((item) => combinedMap.set(item.time, item));
    newData.forEach((item) => combinedMap.set(item.time, item));

    const sortedData = Array.from(combinedMap.values()).sort(
      (a, b) => a.time - b.time
    );
    const cachedData =
      getGmw334Enabled() && sortedData.length > this.MAX_CACHE_ENTRIES
        ? sortedData.slice(-this.MAX_CACHE_ENTRIES)
        : sortedData;

    this.cachedData.set(cacheKey, cachedData);
    this.lastRequestTime.set(cacheKey, Date.now());

    const previousLimit = this.cachedLimit.get(cacheKey) || 0;
    this.cachedLimit.set(cacheKey, Math.max(previousLimit, limit || 0));
  }

  private filterDataByTimeRange(
    data: FormattedCandle[],
    from?: number,
    to?: number
  ): FormattedCandle[] {
    if (!from || !to) return data;

    const fromMs = from * 1000;
    const toMs = to * 1000;

    return data.filter(
      (candle) => candle.time >= fromMs && candle.time <= toMs
    );
  }

  private readonly PERIOD_TO_SECONDS: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '2h': 7200,
    '4h': 14400,
    '1d': 86400,
    '1w': 604800,
    '1M': 2592000,
  };

  private async makeKeeperRequest(
    symbol: string,
    period: string,
    from: number,
    to: number,
    retryCount = 0
  ): Promise<FormattedCandle[]> {
    const cacheKey = this.getCacheKey(symbol, period);
    const tokenAddress = getKeeperTokenAddress(symbol);
    if (!tokenAddress) {
      throw new Error(`No keeper token address found for symbol: ${symbol}`);
    }
    if (!PRICE_CANDLE_GRAPHQL_ENDPOINT) {
      throw new Error('PRICE_CANDLE_GRAPHQL_ENDPOINT is not configured');
    }

    const resolution = this.PERIOD_TO_SECONDS[period] ?? 3600;

    const query = `query Candles($indexToken: String!, $resolution: Int!, $from: Int!, $to: Int!) {
      candles(indexToken: $indexToken, resolution: $resolution, from: $from, to: $to) {
        timestamp
        open
        high
        low
        close
      }
    }`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(PRICE_CANDLE_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query,
          variables: {
            indexToken: tokenAddress,
            resolution,
            from,
            to,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = (await response.json()) as {
        data?: {
          candles?: Array<{
            timestamp: number;
            open: string;
            high: string;
            low: string;
            close: string;
          }>;
        };
        errors?: Array<{ message: string }>;
      };

      if (json.errors?.length) {
        throw new Error(`GraphQL error: ${json.errors[0].message}`);
      }

      const rawCandles = json.data?.candles ?? [];

      const candles: FormattedCandle[] = rawCandles
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((c) => ({
          time: c.timestamp * 1000,
          open: candlePriceToNumber(c.open),
          high: candlePriceToNumber(c.high),
          low: candlePriceToNumber(c.low),
          close: candlePriceToNumber(c.close),
          volume: 0,
        }));

      this.updateCache(cacheKey, candles, rawCandles.length);
      return this.cachedData.get(cacheKey) || candles;
    } catch (error) {
      console.error('Keeper candle request error:', {
        symbol,
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (retryCount < this.MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1))
        );
        return this.makeKeeperRequest(symbol, period, from, to, retryCount + 1);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
