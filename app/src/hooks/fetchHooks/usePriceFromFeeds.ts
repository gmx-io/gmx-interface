import { USD_DECIMALS } from '@/config/constants';
import { GMX_SOLANA_TOKENS } from '@/config/program';
import { DEFAULT_SWR_REFRESH_INTERVAL_5S } from '@/config/ui';
import { GMX_SOLANA_API_ENDPOINT, KEEPER_GRAPHQL_ENDPOINT } from '@/config/url';
import { fetchWithTimeoutLog } from '@/utils/fetchWithTimeoutLog';
import { TokenPrices } from '@/selectors/token/types';
import { getUnit } from '@/utils/legacy/common';
import { getNormalizedTokenSymbolForFetchingPrice } from '@/utils/token/getNormalizedTokenSymbolForFetchingPrice';
import { BN } from '@coral-xyz/anchor';
import { useMemo, useRef } from 'react';
import useSWRSubscription, { SWRSubscriptionOptions } from 'swr/subscription';
import { selectChartToken } from '@/selectors/chart/selectChartToken';
import { useAppStore } from '@/zustand/useAppStore';
import {
  isKeeperToken,
  keeperPriceToTokenPrice,
} from '@/utils/keeper/priceAdapter';
import { gql } from '@apollo/client';
import { print } from 'graphql';

export type PriceProvider = 'gmx';

export interface Prices {
  [address: string]: TokenPrices;
}

export interface Request {
  key: 'token-prices';
  provider: PriceProvider;
  addresses: string[];
}

interface GmxPriceData {
  tokenAddress: string;
  tokenSymbol: string;
  minPrice: string;
  maxPrice: string;
  updatedAt: number;
  timestamp: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const GMX_USD_DECIMALS = 30;
const DECIMALS_ADJUSTMENT = GMX_USD_DECIMALS - USD_DECIMALS; // 30 - 20 = 10

function adjustPrice(price: BN, tokenDecimals: number): BN {
  const adjustedPrice = price
    .mul(getUnit(tokenDecimals))
    .div(getUnit(DECIMALS_ADJUSTMENT));
  return adjustedPrice;
}

const KEEPER_TOKENS_QUERY = gql`
  query KeeperTokenPrices($pubkeys: [StringPubkey!]) {
    tokens(pubkeys: $pubkeys) {
      pubkey
      price {
        min
        max
        ts
        isOpen
      }
    }
  }
`;

function getKeeperTokenAddresses(addresses: string[]): string[] {
  return addresses.filter(isKeeperToken);
}

function buildKeeperPrices(
  data: Array<{ pubkey: string; price: { min: string; max: string } | null }>
): Prices {
  const prices: Prices = {};
  for (const item of data) {
    if (!item.price) continue;
    const config = GMX_SOLANA_TOKENS[item.pubkey];
    if (!config) continue;
    const decimals = config.decimals_gmx ?? config.decimals;
    prices[item.pubkey] = {
      minPrice: keeperPriceToTokenPrice(item.price.min, decimals),
      maxPrice: keeperPriceToTokenPrice(item.price.max, decimals),
    };
  }
  return prices;
}

export const usePriceFromFeeds = ({
  provider = 'gmx',
  addresses,
}: {
  provider?: PriceProvider;
  addresses: string[];
}) => {
  const request = useMemo<Request | null>(() => {
    return addresses.length > 0
      ? {
          key: 'token-prices',
          provider,
          addresses,
        }
      : null;
  }, [addresses, provider]);
  const chartToken = useAppStore(selectChartToken);
  const chartTokenRef = useRef({});
  chartTokenRef.current = chartToken?.symbol || 'SOL';

  const { data } = useSWRSubscription(
    request,
    (_req, { next }: SWRSubscriptionOptions<Prices, Error>) => {
      let retryCount = 0;
      let abortController: AbortController | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      let isMounted = true;

      const keeperAddresses = getKeeperTokenAddresses(addresses);

      const fetchPrices = async (isFirstRequest: boolean) => {
        if (!isMounted) return;
        try {
          abortController = new AbortController();
          const signal = abortController.signal;

          const prices: Prices = {};

          // --- Fetch REST prices for non-keeper tokens ---
          {
            const url = `${GMX_SOLANA_API_ENDPOINT}/cache/prices/tickers`;

            const response = await fetchWithTimeoutLog(url, {
              signal,
              headers: {},
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const priceData = (await response.json()) as GmxPriceData[];

            const selectTokenPop = document.querySelector(
              '#search-input-container'
            );
            const upBlackList = ['trade'];
            const path = window.location.pathname;
            const isBlackList = upBlackList.some((item) => path.includes(item));

            for (const item of priceData) {
              const normalizedSymbol = getNormalizedTokenSymbolForFetchingPrice(
                item.tokenSymbol
              );

              for (const [address, config] of Object.entries(
                GMX_SOLANA_TOKENS
              )) {
                if (isKeeperToken(address)) continue; // skip keeper tokens
                if (
                  getNormalizedTokenSymbolForFetchingPrice(config.symbol) ===
                  normalizedSymbol
                ) {
                  if (
                    selectTokenPop ||
                    isFirstRequest ||
                    (!isFirstRequest &&
                      chartTokenRef.current === config.symbol) ||
                    !isBlackList
                  ) {
                    const minPrice = adjustPrice(
                      new BN(item.minPrice),
                      config.decimals_gmx ?? config.decimals
                    );
                    const maxPrice = adjustPrice(
                      new BN(item.maxPrice),
                      config.decimals_gmx ?? config.decimals
                    );

                    prices[address] = {
                      minPrice,
                      maxPrice,
                    };
                  }
                }
              }
            }
          }

          // --- Fetch keeper prices for keeper tokens ---
          if (keeperAddresses.length > 0 && KEEPER_GRAPHQL_ENDPOINT) {
            try {
              const keeperResponse = await fetch(KEEPER_GRAPHQL_ENDPOINT, {
                method: 'POST',
                signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: print(KEEPER_TOKENS_QUERY),
                  variables: { pubkeys: keeperAddresses },
                }),
              });

              if (keeperResponse.ok) {
                const keeperJson = (await keeperResponse.json()) as {
                  data?: {
                    tokens?: Array<{
                      pubkey: string;
                      price: { min: string; max: string } | null;
                    }>;
                  };
                };

                if (keeperJson.data?.tokens) {
                  const keeperPrices = buildKeeperPrices(
                    keeperJson.data.tokens
                  );
                  Object.assign(prices, keeperPrices);
                }
              }
            } catch (keeperError) {
              console.error('Error fetching keeper prices:', keeperError);
            }
          }

          retryCount = 0;
          if (isMounted) {
            next(null, () => prices);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }

          console.error('Error fetching prices:', error);

          if (retryCount < MAX_RETRIES) {
            retryCount++;
            timeoutId = setTimeout(
              () => void fetchPrices(false),
              RETRY_DELAY * retryCount
            );
          } else {
            console.error('Max retries reached for price fetch');
          }
        }
      };

      // Initial fetch
      void fetchPrices(true);

      // Set up polling interval
      const intervalId = setInterval(
        () => void fetchPrices(false),
        DEFAULT_SWR_REFRESH_INTERVAL_5S
      );

      // Cleanup function
      return () => {
        isMounted = false;
        clearInterval(intervalId);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (abortController) {
          abortController.abort();
        }
      };
    }
  );

  return data ?? {};
};
