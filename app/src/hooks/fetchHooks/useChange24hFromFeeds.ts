import { useMemo, useRef } from 'react';
import useSWRSubscription, { SWRSubscriptionOptions } from 'swr/subscription';
import {
  GMX_SOLANA_API_ENDPOINT,
  PRICE_CANDLE_GRAPHQL_ENDPOINT,
} from '@/config/url';
import { fetchWithTimeoutLog } from '@/utils/fetchWithTimeoutLog';
import { GMX_SOLANA_TOKENS } from '@/config/program';
import { getNormalizedTokenSymbolForFetchingPrice } from '@/utils/token/getNormalizedTokenSymbolForFetchingPrice';
import { DEFAULT_SWR_REFRESH_INTERVAL_2M } from '@/config/ui';
import {
  isKeeperCandleToken,
  candlePriceToNumber,
} from '@/utils/keeper/priceAdapter';

// GMX API response types
interface GmxCandleData {
  period: string;
  candles: [number, number, number, number, number][]; // [timestamp, open, high, low, close]
}

interface Request {
  key: 'token-changes';
  addresses: string[];
}

async function fetchKeeper24hChange(
  tokenAddress: string
): Promise<number | null> {
  const config = GMX_SOLANA_TOKENS[tokenAddress];
  if (!config) return null;

  const now = Math.floor(Date.now() / 1000);
  const from = now - 24 * 3600;

  const query = `query Candles($indexToken: String!, $resolution: Int!, $from: Int!, $to: Int!) {
    candles(indexToken: $indexToken, resolution: $resolution, from: $from, to: $to) {
      timestamp
      open
      close
    }
  }`;

  try {
    const response = await fetch(PRICE_CANDLE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          indexToken: tokenAddress,
          resolution: 3600,
          from,
          to: now,
        },
      }),
    });

    if (!response.ok) return null;

    const json = (await response.json()) as {
      data?: {
        candles?: Array<{ timestamp: number; open: string; close: string }>;
      };
    };

    const candles = json.data?.candles;
    if (!candles || candles.length < 2) return null;

    const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    const oldPrice = candlePriceToNumber(sorted[0].open);
    const currentPrice = candlePriceToNumber(sorted[sorted.length - 1].close);

    if (oldPrice === 0) return null;
    return ((currentPrice - oldPrice) / oldPrice) * 10000;
  } catch (error) {
    console.error(
      `Error fetching keeper 24h change for ${tokenAddress}:`,
      error
    );
    return null;
  }
}

export const useChange24hFromFeeds = ({
  addresses,
  timerDate = DEFAULT_SWR_REFRESH_INTERVAL_2M,
}: {
  addresses: string[];
  timerDate?: number;
}) => {
  const request = useMemo<Request | null>(() => {
    return addresses.length > 0
      ? { key: 'token-changes' as const, addresses }
      : null;
  }, [addresses]);

  const intervalIdRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const { data } = useSWRSubscription(
    request ? JSON.stringify(request) : null,
    (_key, { next }: SWRSubscriptionOptions<Record<string, number>, Error>) => {
      const isMounted = { current: true };

      const fetchChanges = async () => {
        if (!isMounted.current) return;

        try {
          const changes: Record<string, number> = {};
          const promises: Promise<void>[] = [];

          const processedSymbols = new Set<string>();

          for (const address of addresses) {
            const config = GMX_SOLANA_TOKENS[address];
            if (!config) continue;

            const symbol = getNormalizedTokenSymbolForFetchingPrice(
              config.symbol
            );
            if (processedSymbols.has(symbol)) continue;
            processedSymbols.add(symbol);

            // Keeper candle token: use price-candle API
            if (isKeeperCandleToken(address)) {
              const promise = (async () => {
                const change = await fetchKeeper24hChange(address);
                if (change !== null) {
                  for (const [addr, conf] of Object.entries(
                    GMX_SOLANA_TOKENS
                  )) {
                    if (
                      getNormalizedTokenSymbolForFetchingPrice(conf.symbol) ===
                      symbol
                    ) {
                      changes[addr] = change;
                    }
                  }
                }
              })();
              promises.push(promise);
              continue;
            }

            const promise = (async () => {
              try {
                const url = `${GMX_SOLANA_API_ENDPOINT}/v2/cache/prices/candles?tokenSymbol=${symbol}&period=1h&limit=24`;
                const response = await fetchWithTimeoutLog(url, {
                  headers: {
                    // 'Cache-Control': 'no-cache',
                    // Pragma: 'no-cache',
                  },
                });

                if (!response.ok) {
                  console.error(`HTTP error for ${symbol}:`, response.status);
                  return;
                }

                const data = (await response.json()) as GmxCandleData;

                if (data.candles && data.candles.length >= 24) {
                  const currentPrice = data.candles[0][4];
                  const oldPrice = data.candles[23][4];
                  const change = ((currentPrice - oldPrice) / oldPrice) * 10000;

                  for (const [addr, conf] of Object.entries(
                    GMX_SOLANA_TOKENS
                  )) {
                    if (
                      getNormalizedTokenSymbolForFetchingPrice(conf.symbol) ===
                      symbol
                    ) {
                      changes[addr] = change;
                    }
                  }
                }
              } catch (error) {
                console.error(`Error fetching ${symbol} data:`, error);
              }
            })();
            promises.push(promise);
          }

          await Promise.all(promises);

          if (isMounted.current && Object.keys(changes).length > 0) {
            next(null, () => changes);
          }
        } catch (error) {
          console.error('Error in fetchChanges:', error);
          if (isMounted.current && error instanceof Error) {
            next(error);
          }
        }
      };

      void fetchChanges();
      intervalIdRef.current = setInterval(() => {
        void fetchChanges();
      }, timerDate);

      return () => {
        isMounted.current = false;
        clearInterval(intervalIdRef.current);
      };
    }
  );

  return data ?? {};
};
