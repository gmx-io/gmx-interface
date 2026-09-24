import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import { Address, translateAddress, utils } from '@coral-xyz/anchor';
import { MemcmpFilter, PublicKey } from '@solana/web3.js';
import { findMarketPDA } from '@/config/history';
import { useMemo } from 'react';
import useSWR from 'swr';

const USER_ORDER_ADDRESSES_KEY = 'data_store/user-order-addresses';
const BATCH_SIZE = 50;
const BATCH_DELAY = 200; // 200ms delay between batches

const ORDER_DISCRIMATOR = 'PXZJQQ2HEmx';
const DISCRIMATOR_LENGTH = 8;
const SELECTOR_OFFSET = 16;

// Helper function to chunk array
function chunkArray<T>(arr: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += BATCH_SIZE) {
    chunks.push(arr.slice(i, i + BATCH_SIZE));
  }
  return chunks;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const usePendingOrderAddresses = (
  store: Address | undefined,
  marketTokens: Address[]
) => {
  const storeProgram = useStoreProgram();
  const { owner } = useAnchor();

  const request = useMemo(() => {
    const storeAddress = store ? translateAddress(store) : null;
    return storeAddress && owner
      ? {
        key: USER_ORDER_ADDRESSES_KEY,
        selectors: marketTokens
          .map(
            (token) =>
              [
                findMarketPDA(storeAddress, translateAddress(token))[0],
                token.toString(),
              ] as [PublicKey, string]
          )
          .reduce(
            (acc, [marketAddress, token]) => {
              // Action selector = store + market + owner.
              const selector = Buffer.concat([
                storeAddress.toBytes(),
                marketAddress.toBytes(),
                owner.toBytes(),
              ]);
              acc[token] = utils.bytes.bs58.encode(selector);
              return acc;
            },
            {} as Record<string, string>
          ),
      }
      : null;
  }, [marketTokens, owner, store]);

  const { data, isLoading } = useSWR(
    request,
    async ({ selectors }) => {
      // Split selectors into chunks
      const selectorEntries = Object.entries(selectors);
      const selectorChunks = chunkArray(selectorEntries);
      const allOrders: Array<{ marketToken: string; orders: PublicKey[] }> = [];

      for (const chunk of selectorChunks) {
        const discoverOrders = chunk.map(([marketToken, selector]) => {
          const filters = [
            {
              memcmp: {
                offset: 0,
                bytes: ORDER_DISCRIMATOR,
              },
            },
            {
              memcmp: {
                offset: DISCRIMATOR_LENGTH + SELECTOR_OFFSET,
                bytes: selector,
                encoding: 'base58',
              },
            },
          ] as MemcmpFilter[];
          return storeProgram.provider.connection
            .getProgramAccounts(storeProgram.programId, {
              dataSlice: {
                length: 0,
                offset: 0,
              },
              filters,
            })
            .then((orders) => ({
              marketToken,
              orders: orders.map((order) => order.pubkey),
            }));
        });

        // Process current batch
        const batchResults = await Promise.all(discoverOrders);
        allOrders.push(...batchResults);

        // Add delay between chunks if there are multiple chunks
        if (selectorChunks.length > 1) {
          await delay(BATCH_DELAY);
        }
      }

      return allOrders.reduce(
        (acc, { marketToken, orders }) => {
          acc[marketToken] = orders;
          return acc;
        },
        {} as Record<string, PublicKey[]>
      );
    },
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_15S,
    }
  );

  return {
    pendingOrders: data ?? {},
    isLoading,
  };
};
