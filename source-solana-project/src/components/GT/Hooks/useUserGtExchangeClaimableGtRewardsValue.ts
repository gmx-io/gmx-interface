import { BN } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import { BN_ZERO } from '@solana/spl-governance';
import { useTokenPriceMap } from './useTokenPriceMap';
import { useMarkets } from '@/components/Pools/Hooks/useMarkets';
import { useAvailableGtExchangeUserAccounts } from '@/hooks/gtHooks/useAvailableGtExchangeUserAccounts';
import { useAvailableGtExchangeVaults } from '@/hooks/gtHooks/useAvailableGtExchangeVaults';
import { useAvailableGtBanks } from '@/hooks/gtHooks/useAvailableGtBanks';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { DEFAULT_SWR_REFRESH_INTERVAL_5S } from '@/config/ui';
import useSWR from 'swr';

export const useUserGtExchangeClaimableGtRewardsValue = () => {
  const { gtExchangeUserAccounts } = useAvailableGtExchangeUserAccounts();
  const { gtExchangeVaults } = useAvailableGtExchangeVaults();
  const { gtBanks } = useAvailableGtBanks();
  const { tokenPriceMap } = useTokenPriceMap();
  const { marketInfosMap } = useMarkets();
  const claimableValue = useMemo(() => {
    return Object.values(gtExchangeUserAccounts).reduce(
      (totalValue, userAccount) => {
        const vaultAddress = userAccount.vault.toBase58();
        const vault = gtExchangeVaults[vaultAddress];
        if (!vault) return totalValue;
        // Find corresponding bank for this vault
        const bank = Object.values(gtBanks).find(
          (bank) => bank.gtExchangeVault.toBase58() === vaultAddress
        );
        if (!bank || bank.remainingConfirmedGtAmount.isZero())
          return totalValue;

        // Calculate user's share of the bank's rewards
        const userShare = userAccount.amount
          .mul(new BN(1_000_000)) // Scale up for precision
          .div(bank.remainingConfirmedGtAmount);
        // Calculate claimable value from each token in bank's balances
        const bankValue = bank.balances.data.reduce((bankTotal, balance) => {
          const tokenPrice = tokenPriceMap[balance.key]?.maxUnitPrice;
          const tokenDecimals = GMX_SOLANA_TOKENS_RAW[balance.key]?.decimals;
          if (!tokenPrice || !tokenDecimals) return bankTotal;

          const tokenAmount = balance.value.amount
            .mul(userShare)
            .div(new BN(1_000_000)); // Scale back down
          return bankTotal.add(
            tokenAmount
              .mul(new BN(tokenPrice))
              .div(new BN(10).pow(new BN(tokenDecimals)))
          );
        }, BN_ZERO);
        return totalValue.add(bankValue);
      },
      BN_ZERO
    );
  }, [gtExchangeUserAccounts, gtExchangeVaults, gtBanks, tokenPriceMap, marketInfosMap]);
  return {
    claimableValue,
  };
};

// ----------------- hook -----------------
// export const useUserGtExchangeClaimableGtRewardsValue = () => {
//   const { gtExchangeUserAccounts } = useAvailableGtExchangeUserAccounts();
//   const { gtExchangeVaults } = useAvailableGtExchangeVaults();
//   const { gtBanks } = useAvailableGtBanks();
//   const { tokenPriceMap } = useTokenPriceMap();
//   const { marketInfosMap } = useMarkets();

//   const claimableValueFetcher = useMemo(() => {
//     // console.log('claimable proceeds fetch', gtExchangeUserAccounts);
//     return Object.values(gtExchangeUserAccounts).reduce(
//       (totalValue, userAccount) => {
//         const vaultAddress = userAccount.vault.toBase58();
//         const vault = gtExchangeVaults[vaultAddress];
//         if (!vault) return totalValue;
//         // Find corresponding bank for this vault
//         const bank = Object.values(gtBanks).find(
//           (bank) => bank.gtExchangeVault.toBase58() === vaultAddress
//         );
//         if (!bank || bank.remainingConfirmedGtAmount.isZero())
//           return totalValue;

//         // Calculate user's share of the bank's rewards
//         const userShare = userAccount.amount
//           .mul(new BN(1_000_000)) // Scale up for precision
//           .div(bank.remainingConfirmedGtAmount);
//         // Calculate claimable value from each token in bank's balances
//         const bankValue = bank.balances.data.reduce((bankTotal, balance) => {
//           const tokenPrice = tokenPriceMap[balance.key]?.maxUnitPrice;
//           const tokenDecimals = GMX_SOLANA_TOKENS_RAW[balance.key]?.decimals;
//           if (!tokenPrice || !tokenDecimals) return bankTotal;

//           const tokenAmount = balance.value.amount
//             .mul(userShare)
//             .div(new BN(1_000_000)); // Scale back down
//           return bankTotal.add(
//             tokenAmount
//               .mul(new BN(tokenPrice))
//               .div(new BN(10).pow(new BN(tokenDecimals)))
//           );
//         }, BN_ZERO);
//         return totalValue.add(bankValue);
//       },
//       BN_ZERO
//     );
//   }, [gtExchangeUserAccounts, gtExchangeVaults, gtBanks, tokenPriceMap, marketInfosMap]);

//   const { data, isLoading, mutate } = useSWR(
//     'claimable',
//     claimableValueFetcher,
//     {
//       refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_5S,
//     }
//   );

//   return {
//     claimableValue: data ?? new BN(0),
//     isLoading,
//     refresh: mutate,
//   };
// };
