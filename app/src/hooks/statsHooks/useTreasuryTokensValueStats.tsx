import { useTokenPriceMap } from '@/components/Stats/Hooks/useTokenPriceMap';
import { GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS } from '@/config/program';
import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
import { useAnchorProvider, useTreasuryProgram } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';
import useSWR from 'swr';

const TREASURY_VALUE_KEY = 'treasury/value';

export const useTreasuryTokensValueStats = () => {
  const provider = useAnchorProvider();
  const treasuryProgram = useTreasuryProgram();
    const { tokenPriceMap } = useTokenPriceMap();
    let tokensData = tokenPriceMap;
  const treasuryVaultConfig = GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS;

  const request = useMemo(() => {
    if (!treasuryVaultConfig || !provider) return null;

    return {
      key: TREASURY_VALUE_KEY,
      treasuryVaultConfig: treasuryVaultConfig.toString(),
    };
  }, [treasuryVaultConfig, provider]);

  const { data: totalValue, isLoading } = useSWR(
    request,
    async ({ treasuryVaultConfig }) => {
      if (!provider) return new BN(0);

      const treasuryVaultConfigPubkey = new PublicKey(treasuryVaultConfig);
      // Fetch treasury config account data
      const treasuryVaultConfigAccount =
        await treasuryProgram.account.treasuryVaultConfig.fetch(
          treasuryVaultConfigPubkey
        );

      // Get token list from treasury config
      const tokenAddresses = treasuryVaultConfigAccount.tokens.data
        .slice(0, treasuryVaultConfigAccount.tokens.count)
        .map((entry) => new PublicKey(entry.key).toString());

      let totalValueBN = new BN(0);

      await Promise.all(
        tokenAddresses.map(async (tokenAddress) => {
          try {
            const tokenPubkey = new PublicKey(tokenAddress);
            const tokenData = tokensData[tokenAddress];

            // Skip if token data or prices are not available
            if (!tokenData?.unitPrice) return;

            const ata = getAssociatedTokenAddressSync(
              tokenPubkey,
              treasuryVaultConfigPubkey,
              true
            );

            // Get token account balance, return early if account doesn't exist
            const balance = await provider.connection
              .getTokenAccountBalance(ata)
              .catch(() => null);

            if (!balance?.value?.amount) return;

            const tokenBalance = new BN(balance.value.amount);
            // const tokenDecimals = balance.value.decimals;
            const tokenPrice = new BN(tokenData.unitPrice);

            // Calculate token value: balance * price / (10 ^ decimals)
            const tokenValue = tokenBalance
              .mul(tokenPrice)
              // .div(new BN(10).pow(new BN(tokenDecimals)));

            totalValueBN = totalValueBN.add(tokenValue);
          } catch (error) {
            console.warn(
              `Warning: Failed to fetch value for token ${tokenAddress}:`,
              error
            );
          }
        })
      );
      return totalValueBN;
    },
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_15S,
    }
  );

  return {
    treasuryValue: totalValue || new BN(0),
    isLoading,
  };
};
