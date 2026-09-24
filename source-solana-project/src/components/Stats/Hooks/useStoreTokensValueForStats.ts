import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { getGmw301Enabled } from '@/config/featureFlagEnable';
import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import {
  DEFAULT_SWR_REFRESH_INTERVAL_5S,
  DEFAULT_SWR_REFRESH_INTERVAL_60S,
} from '@/config/ui';
import { useAnchorProvider } from '@/contexts/anchor';
import useSocketStore from '@/zustand/socketStore';
import { BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';
import useSWR from 'swr';
import { useTokenPriceMap } from './useTokenPriceMap';

const STORE_TOKENS_VALUE_KEY = 'store/tokens_value';

interface StoreTokenBalances {
  tokenBalances: Record<string, BN>;
  solBalance: BN;
}

export const useStoreTokensValueForStats = () => {
  const isGmw301Enabled = getGmw301Enabled();
  const provider = useAnchorProvider();
  const storeBalancesPayload = useSocketStore((state) => state.storeBalances);
  const { tokenPriceMap } = useTokenPriceMap();
  const hasTokenPrices = Object.values(tokenPriceMap).some((tokenData) =>
    Boolean(tokenData?.unitPrice)
  );

  const swrKey = useMemo(() => {
    if (isGmw301Enabled || !provider || !hasTokenPrices) return null;
    return [STORE_TOKENS_VALUE_KEY, GMX_SOLANA_STORE_ADDRESS.toString()];
  }, [isGmw301Enabled, provider, hasTokenPrices]);

  const { data: rpcStoreBalances, isLoading: isRpcStoreLoading } =
    useSWR<StoreTokenBalances>(
      swrKey,
      async ([, storeAddress]: [string, string]) => {
        if (!provider) return { tokenBalances: {}, solBalance: new BN(0) };

        const storePubkey = new PublicKey(storeAddress);
        const tokenBalances: Record<string, BN> = {};

        const tokenAccounts = await provider.connection.getTokenAccountsByOwner(
          storePubkey,
          { programId: TOKEN_PROGRAM_ID }
        );
        try {
          for (const ta of tokenAccounts.value) {
            const decoded = AccountLayout.decode(ta.account.data);
            const mintAddress = decoded.mint.toBase58();
            const existing = tokenBalances[mintAddress] ?? new BN(0);
            tokenBalances[mintAddress] = existing.add(
              new BN(decoded.amount.toString())
            );
          }
        } catch (error) {
          if (error instanceof Error) {
            console.warn(
              'Warning: Failed to decode token accounts:',
              error.message
            );
          }
        }

        let solBalance = new BN(0);
        try {
          solBalance = new BN(await provider.connection.getBalance(storePubkey));
        } catch (error) {
          if (error instanceof Error) {
            console.warn(
              'Warning: Failed to get native SOL balance:',
              error.message
            );
          }
        }
        return { tokenBalances, solBalance };
      },
      {
        refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_60S,
        revalidateOnMount: true,
        revalidateIfStale: false,
        revalidateOnFocus: false,
        keepPreviousData: true,
        shouldRetryOnError: true,
        dedupingInterval: DEFAULT_SWR_REFRESH_INTERVAL_5S,
      }
    );

  const wsStoreBalances = useMemo<StoreTokenBalances | null>(() => {
    if (!isGmw301Enabled) return null;
    if (
      !storeBalancesPayload ||
      storeBalancesPayload.store !== GMX_SOLANA_STORE_ADDRESS.toString()
    ) {
      return null;
    }
    const tokenBalances: Record<string, BN> = {};

    for (const tokenBalance of storeBalancesPayload.tokenBalances) {
      const existing = tokenBalances[tokenBalance.mint] ?? new BN(0);
      tokenBalances[tokenBalance.mint] = existing.add(
        new BN(tokenBalance.amount)
      );
    }

    return {
      tokenBalances,
      solBalance: new BN(storeBalancesPayload.solBalance),
    };
  }, [isGmw301Enabled, storeBalancesPayload]);

  const storeBalances = isGmw301Enabled ? wsStoreBalances : rpcStoreBalances;

  const totalValue = useMemo(() => {
    if (!storeBalances) return new BN(0);
    let totalValueBN = new BN(0);

    for (const [mintAddress, tokenBalance] of Object.entries(
      storeBalances.tokenBalances
    )) {
      const tokenData = tokenPriceMap[mintAddress];
      if (!tokenData?.unitPrice) continue;
      totalValueBN = totalValueBN.add(
        tokenBalance.mul(new BN(tokenData.unitPrice))
      );
    }

    if (storeBalances.solBalance.gt(new BN(0))) {
      const solTokenData = tokenPriceMap[NATIVE_TOKEN_ADDRESS.toString()];
      if (solTokenData?.unitPrice) {
        totalValueBN = totalValueBN.add(
          storeBalances.solBalance.mul(new BN(solTokenData.unitPrice))
        );
      }
    }

    return totalValueBN;
  }, [storeBalances, tokenPriceMap]);
  return {
    storeTokensValue: totalValue,
    isStoreLoading: isGmw301Enabled
      ? !wsStoreBalances || !hasTokenPrices
      : isRpcStoreLoading,
  };
};
