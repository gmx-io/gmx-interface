import { BN } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import { useAvailableGtExchangeUserAccounts } from './useAvailableGtExchangeUserAccounts';
import { useAvailableGtExchangeVaults } from './useAvailableGtExchangeVaults';
import { useAvailableGtBanks } from './useAvailableGtBanks';
import { BN_ZERO } from '@solana/spl-governance';
import { useAppStore } from '@/zustand/useAppStore';
import { selectTokensData } from '@/selectors/token/selectTokensData';

export const useUserGtExchangeClaimableGtRewardsValue = () => {
  const { gtExchangeUserAccounts } = useAvailableGtExchangeUserAccounts();
  const { gtExchangeVaults } = useAvailableGtExchangeVaults();
  const { gtBanks } = useAvailableGtBanks();
  const tokensData = useAppStore(selectTokensData);

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
          const tokenData = tokensData[balance.key];
          if (!tokenData?.prices) return bankTotal;

          const tokenPrice = tokenData.prices.maxPrice;
          const tokenAmount = balance.value.amount
            .mul(userShare)
            .div(new BN(1_000_000)); // Scale back down

          return bankTotal.add(
            tokenAmount
              .mul(tokenPrice)
              .div(new BN(10).pow(new BN(tokenData.decimals)))
          );
        }, BN_ZERO);

        return totalValue.add(bankValue);
      },
      BN_ZERO
    );
  }, [gtExchangeUserAccounts, gtExchangeVaults, gtBanks, tokensData]);

  return {
    claimableValue,
  };
};
