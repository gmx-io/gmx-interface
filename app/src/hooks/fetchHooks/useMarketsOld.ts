/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  GMX_SOLANA_MARKET_TOKENS,
  GMX_SOLANA_STORE_ADDRESS,
} from '@/config/program';
import { DEFAULT_SWR_REFRESH_INTERVAL_5S } from '@/config/ui';
import { useStoreProgram } from '@/contexts/anchor';
import {
  decodeMarketAccount,
  DecodedMarketAccount,
} from '@/utils/market/decodeMarketAccount';
import { useAppStore } from '@/zustand/useAppStore';
import { PublicKey } from '@solana/web3.js';
import { findMarketPDA } from 'gmsol';
import { useCallback } from 'react';
import useSWR from 'swr';

export const MARKETS_KEY = 'data_store/markets';

const BATCH_SIZE = 50;
const BATCH_DELAY = 200;

interface UseMarketsOptions {
  enableRefresh?: boolean;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function chunkArray<T>(arr: T[], size: number = BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const useMarkets = (
  options: UseMarketsOptions = {}
): {
  markets: Record<string, DecodedMarketAccount>;
  isLoading: boolean;
} => {
  const storeProgram = useStoreProgram();
  const setAllMarketsAndStates = useAppStore(
    (state) => state.markets.setAllMarketsAndStates
  );
  const setMarketBase64Map = useAppStore(
    (state) => state.markets.setMarketBase64Map
  );

  const fetchMarkets = useCallback(async () => {
    console.count('Fetching markets');
    const store = GMX_SOLANA_STORE_ADDRESS;
    const marketTokens = GMX_SOLANA_MARKET_TOKENS;
    const marketAddresses = marketTokens.map((token) =>
      findMarketPDA(store, token)[0].toBase58()
    );
    const addressChunks = chunkArray(marketAddresses);
    const marketMap: Record<string, DecodedMarketAccount> = {};
    const base64Map = new Map<string, string>();

    for (const addresses of addressChunks) {
      const accountInfos =
        await storeProgram.provider.connection.getMultipleAccountsInfo(
          addresses.map((address) => new PublicKey(address)),
          'confirmed'
        );

      accountInfos.forEach((accountInfo, chunkIndex) => {
        const address = addresses[chunkIndex];
        if (!accountInfo?.data) {
          console.error(`Account ${address} does not exist or has no value`);
          return;
        }

        const decoded = decodeMarketAccount(
          accountInfo.data,
          address,
          storeProgram
        );
        if (!decoded) return;

        const key = decoded.meta.marketTokenAddress.toBase58();
        marketMap[key] = decoded;
        base64Map.set(key, accountInfo.data.toString('base64'));
      });

      if (addressChunks.length > 1) {
        await delay(BATCH_DELAY);
      }
    }

    setAllMarketsAndStates(marketMap);
    setMarketBase64Map(base64Map);

    return marketMap;
  }, [storeProgram, setAllMarketsAndStates, setMarketBase64Map]);

  const { data, isLoading } = useSWR(
    MARKETS_KEY,
    fetchMarkets,
    options.enableRefresh === false
      ? { revalidateOnFocus: false, revalidateOnReconnect: false }
      : { refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_5S }
  );

  return {
    markets: data ?? {},
    isLoading,
  };
};

export type { DecodedMarketAccount };
