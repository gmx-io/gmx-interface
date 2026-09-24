import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
import { useAnchorProvider } from '@/contexts/anchor';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { getTokenData } from '@/utils/token/getTokenData';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';
import useSWR from 'swr';

const STORE_TOKENS_VALUE_KEY = 'store/tokens_value';

interface StoreTokensValueRequest {
  key: string;
  storeAddress: string;
}

export const useStoreTokensValue = () => {
  const provider = useAnchorProvider();
  const tokensData = useAppStore(selectTokensData);

  const request = useMemo<StoreTokensValueRequest | null>(() => {
    if (!provider) return null;

    return {
      key: STORE_TOKENS_VALUE_KEY,
      storeAddress: GMX_SOLANA_STORE_ADDRESS.toString(),
    };
  }, [provider]);

  const { data: totalValue, isLoading } = useSWR(
    request,
    async ({ storeAddress }: StoreTokensValueRequest) => {
      if (!provider) return new BN(0);

      const storePubkey = new PublicKey(storeAddress);
      let totalValueBN = new BN(0);

      // First get all token accounts for the store address
      const tokenAccounts = await provider.connection.getTokenAccountsByOwner(
        storePubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      // Process each token account

      await Promise.all(
        tokenAccounts.value.map(async (tokenAccount) => {
          try {
            // Parse the token account data
            const balance = await provider.connection.getTokenAccountBalance(
              tokenAccount.pubkey
            );
            if (!balance?.value?.amount || !balance?.value?.decimals) return;

            // Get the mint address from the token account
            const accountData = await provider.connection.getAccountInfo(
              tokenAccount.pubkey
            );
            if (!accountData || accountData.data.length === 0) return;

            // The mint address is stored at byte offset 0 in the token account data
            const mintAddress = new PublicKey(accountData.data.slice(0, 32));
            // Get token data using the utility function
            const tokenData = getTokenData(tokensData, mintAddress);
            if (!tokenData?.prices) {
              // console.log(`Debug: No price data for token mint ${mintString}`);
              return;
            }

            const tokenBalance = new BN(balance.value.amount);
            const tokenDecimals = balance.value.decimals;
            const tokenPrice = tokenData.prices.maxPrice;

            // Calculate token value: balance * price / (10 ^ decimals)
            const tokenValue = tokenBalance
              .mul(tokenPrice)
              .div(new BN(10).pow(new BN(tokenDecimals)));

            totalValueBN = totalValueBN.add(tokenValue);
          } catch (error) {
            if (error instanceof Error) {
              console.warn(
                `Warning: Failed to process token account:`,
                error.message
              );
            }
          }
        })
      );

      // Handle native SOL balance
      try {
        const solBalance = await provider.connection.getBalance(storePubkey); 
        if (solBalance > 0) {
          const solTokenData = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

          if (solTokenData?.prices) {
            const solValue = new BN(solBalance)
              .mul(solTokenData.prices.maxPrice)
              .div(new BN(10).pow(new BN(9))); // SOL has 9 decimals
            totalValueBN = totalValueBN.add(solValue);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.warn(
            'Warning: Failed to get native SOL balance:',
            error.message
          );
        }
      }
      return totalValueBN;
    },
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_15S,
    }
  );

  return {
    storeTokensValue: totalValue || new BN(0),
    isLoading,
  };
};
