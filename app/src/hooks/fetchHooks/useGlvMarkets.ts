import { BN_ZERO } from '@/config/constants';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { useStoreProgram } from '@/contexts/anchor';
import { GlvInfoData, GlvMarketData } from '@/selectors/glv/types';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { findGlvPDA } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

import { useGlvMarketTokenBalances } from './useGlvMarketTokenBalances';
import { getGmw299Enabled } from '@/config/featureFlagEnable';
import { useMarinGlvAccounts } from '@/hooks/marin/useMarinGlvAccounts';

const GLV_MARKETS_KEY = 'data_store/glv_markets';
const BATCH_SIZE = 50;
const BATCH_DELAY = 200; // 200ms delay between batches

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

type GlvAccount = {
  glvToken: PublicKey;
  longToken: PublicKey;
  shortToken: PublicKey;
  minTokensForFirstDeposit: BN;
  shiftLastExecutedAt: BN;
  markets: {
    data: Array<{
      key: string;
      value: {
        maxValue: BN;
        maxAmount: BN;
      };
    }>;
  };
};

type GlvMarketsResponse = Record<string, GlvInfoData>;

type RequestType = {
  key: string;
  glvAddresses: string[];
} | null;

// Helper function to process GLV account data
function processGlvAccount(
  glvAccount: GlvAccount | null,
  glvAddress: PublicKey
): GlvInfoData | null {
  if (!glvAccount) return null;

  const markets: GlvMarketData[] = glvAccount.markets.data.map((market) => ({
    marketTokenAddress: new PublicKey(market.key),
    isDisabled: false,
    isSingle: glvAccount.longToken.equals(glvAccount.shortToken),
    minTokensForFirstDeposit: glvAccount.minTokensForFirstDeposit,
    maxMarketTokenBalanceUsd: market.value.maxValue,
    glvMaxMarketTokenBalanceAmount: market.value.maxAmount,
    gmBalance: BN_ZERO, // Initial value, will be updated with real balance
  }));

  return {
    glvAddress: glvAddress,
    glvTokenAddress: glvAccount.glvToken,
    longTokenAddress: glvAccount.longToken,
    shortTokenAddress: glvAccount.shortToken,
    shiftLastExecutedAt: glvAccount.shiftLastExecutedAt,
    markets,
  };
}

export const useGlvMarkets = (glvTokens: PublicKey[]) => {
  const dataStore = useStoreProgram();
  const store = GMX_SOLANA_STORE_ADDRESS;
  const isGmw299Enabled = getGmw299Enabled();
  const marinGlvAccounts = useMarinGlvAccounts(glvTokens, isGmw299Enabled);

  const request = useMemo(() => {
    if (isGmw299Enabled) return null;
    if (!store || !glvTokens) return null;

    return {
      key: GLV_MARKETS_KEY,
      glvAddresses: glvTokens.map((token) => findGlvPDA(token)[0].toBase58()),
    };
  }, [isGmw299Enabled, store, glvTokens]);

  const { data: glvsData, isLoading } = useSWR<
    GlvMarketsResponse,
    Error,
    RequestType
  >(
    request,
    async (req) => {
      const glvsResponse: GlvMarketsResponse = {};

      // Convert addresses to PublicKey and split into chunks
      const addressChunks = chunkArray(
        req.glvAddresses.map((addr) => new PublicKey(addr))
      );

      // Process each chunk
      for (const chunk of addressChunks) {
        // Fetch GLV accounts for current chunk
        const glvAccounts = (await dataStore.account.glv.fetchMultiple(
          chunk
        )) as (GlvAccount | null)[];

        // Process GLV accounts
        glvAccounts.forEach((glvAccount, index) => {
          const processedGlv = processGlvAccount(glvAccount, chunk[index]);
          if (processedGlv) {
            glvsResponse[processedGlv.glvTokenAddress.toBase58()] =
              processedGlv;
          }
        });

        // Add delay between chunks if there are multiple chunks
        if (addressChunks.length > 1) {
          await delay(BATCH_DELAY);
        }
      }

      return glvsResponse;
    },
    {}
  );

  const allGlvAddressesAndMarkets = useMemo(() => {
    const sourceGlvsData = isGmw299Enabled
      ? marinGlvAccounts.glvsData
      : glvsData;

    if (!sourceGlvsData) return [];
    return Object.entries(sourceGlvsData).map((entry) => {
      const glvInfo = entry[1];
      const validMarkets = glvInfo.markets.filter(
        (m) => !m.marketTokenAddress.equals(NATIVE_TOKEN_ADDRESS)
      );

      return {
        glvAddress: glvInfo.glvAddress,
        marketTokens: validMarkets.map((m) => m.marketTokenAddress),
      };
    });
  }, [glvsData, isGmw299Enabled, marinGlvAccounts.glvsData]);

  // Fetch balances for all GLVs' market tokens
  const allMarketBalances = useGlvMarketTokenBalances(
    allGlvAddressesAndMarkets
  );

  // Combine GLV data with market token balances
  const glvsWithBalances = useMemo(() => {
    const sourceGlvsData = isGmw299Enabled
      ? marinGlvAccounts.glvsData
      : glvsData;

    if (!sourceGlvsData) return {};

    return Object.entries(sourceGlvsData).reduce<GlvMarketsResponse>(
      (acc, [glvAddress, glvInfo]) => {
        const glvBalances =
          allMarketBalances[glvInfo.glvAddress.toBase58()] ?? {};

        const marketsWithBalances = glvInfo.markets.map((market) => ({
          ...market,
          gmBalance:
            glvBalances[market.marketTokenAddress.toBase58()] ?? BN_ZERO,
        }));

        acc[glvAddress] = {
          ...glvInfo,
          markets: marketsWithBalances,
        };

        return acc;
      },
      {}
    );
  }, [
    allMarketBalances,
    glvsData,
    isGmw299Enabled,
    marinGlvAccounts.glvsData,
  ]);

  return {
    glvs: glvsWithBalances,
    isLoading: isGmw299Enabled ? marinGlvAccounts.isLoading : isLoading,
  };
};
