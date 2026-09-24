import { DEFAULT_SWR_REFRESH_INTERVAL_60S } from '@/config/ui';
import { useAnchorProvider } from '@/contexts/anchor';
import { TokenBalances } from '@/selectors/token/types';
import { Address, translateAddress } from '@coral-xyz/anchor';
import { AccountLayout, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { toBN } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

const GLV_MARKET_BALANCES_KEY = 'glv-market-token-balances';
const BATCH_SIZE = 50;
const BATCH_DELAY = 200;

type GlvMarketTokens = {
  glvAddress: Address;
  marketTokens: Address[];
};

type RequestType = {
  key: string;
  glvs: {
    glvAddress: string;
    marketTokens: string[];
  }[];
} | null;

function chunkArray<T>(arr: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += BATCH_SIZE) {
    chunks.push(arr.slice(i, i + BATCH_SIZE));
  }
  return chunks;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useGlvMarketTokenBalances = (
  glvsWithMarkets: GlvMarketTokens[]
): Record<string, TokenBalances> => {
  const provider = useAnchorProvider();

  const request = useMemo(() => {
    if (!glvsWithMarkets.length) return null;

    return {
      key: GLV_MARKET_BALANCES_KEY,
      glvs: glvsWithMarkets.map(({ glvAddress, marketTokens }) => ({
        glvAddress: glvAddress.toString(),
        marketTokens: marketTokens.map((token) => token.toString()),
      })),
    };
  }, [glvsWithMarkets]);

  const { data } = useSWR<Record<string, TokenBalances>, Error, RequestType>(
    request,
    async ({ glvs }) => {
      const allBalances: Record<string, TokenBalances> = {};

      if (!provider) return allBalances;

      const glvChunks = chunkArray(glvs);

      for (const glvChunk of glvChunks) {
        await Promise.all(
          glvChunk.map(async ({ glvAddress, marketTokens }) => {
            const glvPubkey = translateAddress(glvAddress);
            const balances: TokenBalances = {};
            const marketTokenChunks = chunkArray(marketTokens);

            for (const tokenChunk of marketTokenChunks) {
              const ataAddresses = tokenChunk.map((tokenAddress) => {
                const marketTokenPubkey = translateAddress(tokenAddress);
                return getAssociatedTokenAddressSync(
                  marketTokenPubkey,
                  glvPubkey,
                  true
                );
              });

              const accountInfos =
                await provider.connection.getMultipleAccountsInfo(
                  ataAddresses,
                  'confirmed'
                );

              accountInfos.forEach((accountInfo) => {
                if (!accountInfo?.data) return;
                const data = AccountLayout.decode(accountInfo.data);
                balances[data.mint.toBase58()] = toBN(data.amount);
              });

              if (marketTokenChunks.length > 1) {
                await delay(BATCH_DELAY);
              }
            }

            allBalances[glvAddress] = balances;
          })
        );

        if (glvChunks.length > 1) {
          await delay(BATCH_DELAY);
        }
      }

      return allBalances;
    },
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_60S,
    }
  );

  return data ?? {};
};
