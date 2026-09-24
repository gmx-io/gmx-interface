/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
// import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
import {
  DEFAULT_SWR_REFRESH_INTERVAL_5S,
} from '@/config/ui';
import { getGmw347Enabled } from '@/config/featureFlagEnable';
import { useMakeStatusStoreProgram } from '@/contexts/anchor';
import { Market, MarketStatus } from '@/selectors/market/types';
import {
  selectSetAllMarketStatuses,
  selectSetMarketStatus,
} from '@/selectors/market/baseSelectors';
import { TokenPrices } from '@/selectors/token/types';
import { getMarketPrices } from '@/utils/market/getMarketPrices';
import { MarketMetaForRequest } from '@/zustand/types';
import {
  getMarketMetaForRequest,
  getStableMarketRequestSignature,
} from '@/zustand/utils';
import { useAppStore } from '@/zustand/useAppStore';
import { translateAddress } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import useSWR from 'swr';

const MARKET_STATUS_KEY = 'data_store/market-status';
const EMPTY_ARRAY: MarketMetaForRequest[] = [];
const BATCH_SIZE = 50;
const BATCH_DELAY = 200; // 200ms delay between batches

// Helper function to chunk array
function chunkArray(arr: MarketMetaForRequest[]): MarketMetaForRequest[][] {
  const chunks: MarketMetaForRequest[][] = [];
  for (let i = 0; i < arr.length; i += BATCH_SIZE) {
    chunks.push(arr.slice(i, i + BATCH_SIZE));
  }
  return chunks;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to fetch market status
async function fetchMarketStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any, // TODO: Replace with proper type when available
  req: MarketMetaForRequest,
  prices: Record<string, TokenPrices>
): Promise<{ key: string; status: MarketStatus } | null> {
  const marketPrices = getMarketPrices(prices, req);
  if (!marketPrices) return null;
  try {
    const status = (await store.methods
      .getMarketStatus(marketPrices, true, true)
      .accounts({
        market: translateAddress(req.address),
      })
      .view()) as MarketStatus;
    return { key: req.key.toBase58(), status };
  } catch (error) {
    console.log(
      `Failed to fetch market status for ${req.key.toBase58()}:`,
      error
    );
    return null;
  }
}

export const useMarketsStatus = (
  markets: Market[],
  prices: Record<string, TokenPrices>,
  isPricesInitialized: boolean,
  areMarketsInitialized: boolean = true
) => {
  const store = useMakeStatusStoreProgram();
  const setMarketStatus = useAppStore(selectSetMarketStatus);
  const setAllMarketStatuses = useAppStore(selectSetAllMarketStatuses);
  const reqs = useMemo(
    () =>
      isPricesInitialized && areMarketsInitialized
        ? markets.map((market) => getMarketMetaForRequest(market))
        : EMPTY_ARRAY,
    [areMarketsInitialized, isPricesInitialized, markets]
  );
  const reqKey = useMemo(() => {
    if (!isPricesInitialized || !areMarketsInitialized || reqs.length === 0) {
      return null;
    }
    return `${MARKET_STATUS_KEY}:${getStableMarketRequestSignature(markets)}`;
  }, [areMarketsInitialized, isPricesInitialized, markets, reqs.length]);
  const { data, isLoading } = useSWR(
    reqKey,
    async () => {
      const marketsStatus = {} as Record<string, MarketStatus>;
      // Split requests into chunks
      const reqChunks = chunkArray(reqs);

      for (const reqChunk of reqChunks) {
        // Process current batch
        const results = await Promise.all(
          reqChunk.map((req) => fetchMarketStatus(store, req, prices))
        );

        // Add successful results to marketsStatus
        results.forEach((result) => {
          if (result) {
            marketsStatus[result.key] = result.status;
          }
        });

        // Add delay between chunks if there are multiple chunks
        if (reqChunks.length > 1) {
          await delay(BATCH_DELAY);
        }
      }

      return marketsStatus;
    },
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_5S,
      onSuccess: (data) => {
        if (!data) {
          return;
        }
        if (getGmw347Enabled()) {
          setAllMarketStatuses(data);
          return;
        }
        if (setMarketStatus) {
          Object.entries(data).forEach(([key, status]) => {
            setMarketStatus(key, status);
          });
        }
      },
    }
  );

  return {
    marketsStatus: data ?? {},
    isLoading,
  };
};
