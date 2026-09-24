import { MAX_SUPPLY } from '@/config/constants';
import { getGmw300Enabled } from '@/config/featureFlagEnable';
import { useMarinTokenMetadatas } from '@/hooks/marin/useMarinTokenMetadatas';
import { TokenMetadatas } from '@/selectors/token/types';
// import { Address, translateAddress } from '@coral-xyz/anchor';
import { Address } from '@coral-xyz/anchor';
// import {
//   getMint,
//   MintLayout,
//   TOKEN_2022_PROGRAM_ID,
//   TOKEN_PROGRAM_ID,
// } from '@solana/spl-token';
import { MintLayout, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { useConnection } from '@solana/wallet-adapter-react';
import { toBN } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';
import { DEFAULT_SWR_REFRESH_INTERVAL_60S } from '@/config/ui';
import { PublicKey } from '@solana/web3.js';

const METADATA_KEY = 'token-metadatas';
const BATCH_SIZE = 50;
const BATCH_DELAY = 200; // 200ms delay between batches

// Helper function to chunk array into smaller arrays
const chunk = <T>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
};

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// SPL Token 2022 Program
export const useTokenMetadatasForGlv = (tokens: Address[] | undefined) => {
  const isGmw300Enabled = getGmw300Enabled();
  const marinTokenMetadatas = useMarinTokenMetadatas(tokens);
  const connection = useConnection();

  const request = useMemo(() => {
    if (isGmw300Enabled) return null;
    if (!tokens) return null;
    return {
      key: METADATA_KEY,
      tokens: tokens.map((key) => key.toString()),
    };
  }, [isGmw300Enabled, tokens]);

  const { data, isLoading } = useSWR(
    request,
    async ({ tokens }) => {
      const tokenDatas: TokenMetadatas = {};

      // Split tokens into chunks
      const tokenChunks = chunk(tokens, BATCH_SIZE);

      for (const tokenChunk of tokenChunks) {
        const accounts = await connection.connection.getMultipleAccountsInfo(
          tokenChunk.map((address) => new PublicKey(address)),
          'confirmed'
        );
        accounts.map((accountInfo, index) => {
          const mintAddress = tokenChunk[index];
          if (!accountInfo) {
            return { mint: mintAddress, error: 'Account not found' };
          }

          if (!accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
            return {
              mint: mintAddress,
              error: 'Not a token mint account',
            };
          }

          const data = MintLayout.decode(accountInfo.data);
          // Add successful results to tokenDatas

          const totalSupply = toBN(data.supply);
          tokenDatas[mintAddress.toString()] = {
            decimals: data.decimals,
            totalSupply,
            maxMintable: MAX_SUPPLY.sub(totalSupply),
          };
        });

        // Add delay between chunks if there are multiple chunks
        if (tokenChunks.length > 1) {
          await delay(BATCH_DELAY);
        }
      }

      return tokenDatas;
    },
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_60S,
    }
  );

  if (isGmw300Enabled) {
    return marinTokenMetadatas;
  }

  return {
    tokenMetadatas: data ?? {},
    isLoading,
  };
};
