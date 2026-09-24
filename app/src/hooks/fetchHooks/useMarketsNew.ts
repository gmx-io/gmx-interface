/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  GMX_SOLANA_MARKET_TOKENS,
  GMX_SOLANA_STORE_ADDRESS,
} from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import {
  decodeMarketAccount,
  DecodedMarketAccount,
} from '@/utils/market/decodeMarketAccount';
import { useAppStore } from '@/zustand/useAppStore';
import { findMarketPDA } from 'gmsol';
import { useEffect, useMemo, useRef, useState } from 'react';

export const MARKETS_KEY = 'data_store/markets';

const BATCH_SIZE = 50;

interface UseMarketsOptions {
  enableRefresh?: boolean;
}

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
  const setAllMarketAccountData = useAppStore(
    (state) => state.markets.setAllMarketAccountData
  );
  const [markets, setMarkets] = useState<
    Record<string, DecodedMarketAccount>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const cacheRef = useRef<Map<string, DecodedMarketAccount>>(new Map());
  const base64CacheRef = useRef<Map<string, string>>(new Map());
  const latestSlotRef = useRef<Map<string, number>>(new Map());

  const marketAccounts = useMemo(
    () =>
      GMX_SOLANA_MARKET_TOKENS.map((marketToken) => ({
        address: findMarketPDA(GMX_SOLANA_STORE_ADDRESS, marketToken)[0],
        marketToken: marketToken.toBase58(),
      })),
    []
  );

  useEffect(() => {
    const connection = storeProgram.provider.connection;
    let disposed = false;
    let snapshotInFlight = false;
    let snapshotLoaded = false;

    cacheRef.current = new Map();
    base64CacheRef.current = new Map();
    latestSlotRef.current = new Map();
    setMarkets({});
    setIsLoading(true);

    const flush = () => {
      if (disposed) return;
      const nextMarkets = Object.fromEntries(cacheRef.current.entries());
      const nextBase64Map = new Map(base64CacheRef.current);
      setMarkets(nextMarkets);
      setAllMarketAccountData(nextMarkets, nextBase64Map);
    };

    const applyAccount = (
      address: string,
      marketToken: string,
      data: Buffer | null,
      slot: number
    ) => {
      const latestSlot = latestSlotRef.current.get(address);
      if (latestSlot != null && latestSlot > slot) return false;
      latestSlotRef.current.set(address, slot);

      if (!data) {
        cacheRef.current.delete(marketToken);
        base64CacheRef.current.delete(marketToken);
        return true;
      }

      const decoded = decodeMarketAccount(data, address, storeProgram);
      if (!decoded) return false;
      const key = decoded.meta.marketTokenAddress.toBase58();
      cacheRef.current.set(key, decoded);
      base64CacheRef.current.set(key, data.toString('base64'));
      return true;
    };

    const loadSnapshot = async () => {
      if (snapshotInFlight) return;
      snapshotInFlight = true;
      try {
        for (const accountChunk of chunkArray(marketAccounts)) {
          const response =
            await connection.getMultipleAccountsInfoAndContext(
              accountChunk.map(({ address }) => address),
              { commitment: 'confirmed' }
            );
          if (disposed) return;
          response.value.forEach((accountInfo, index) => {
            const account = accountChunk[index];
            applyAccount(
              account.address.toBase58(),
              account.marketToken,
              accountInfo?.data ?? null,
              response.context.slot
            );
          });
        }
        snapshotLoaded = true;
        flush();
      } catch (error) {
        if (!disposed) {
          console.error('Failed to fetch market snapshot:', error);
          snapshotLoaded = true;
          flush();
        }
      } finally {
        snapshotInFlight = false;
        if (!disposed) setIsLoading(false);
      }
    };

    const subscriptionIds = marketAccounts.map(({ address, marketToken }) =>
      connection.onAccountChange(
        address,
        (accountInfo, context) => {
          if (
            !disposed &&
            applyAccount(
              address.toBase58(),
              marketToken,
              accountInfo.data,
              context.slot
            ) &&
            snapshotLoaded
          ) {
            flush();
          }
        },
        'confirmed'
      )
    );

    void loadSnapshot();

    const refreshSnapshot = () => {
      if (
        options.enableRefresh !== false &&
        document.visibilityState === 'visible'
      ) {
        void loadSnapshot();
      }
    };
    document.addEventListener('visibilitychange', refreshSnapshot);
    window.addEventListener('online', refreshSnapshot);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', refreshSnapshot);
      window.removeEventListener('online', refreshSnapshot);
      for (const subscriptionId of subscriptionIds) {
        void connection
          .removeAccountChangeListener(subscriptionId)
          .catch(() => undefined);
      }
    };
  }, [
    marketAccounts,
    options.enableRefresh,
    setAllMarketAccountData,
    storeProgram,
  ]);

  return {
    markets,
    isLoading,
  };
};

export type { DecodedMarketAccount };
