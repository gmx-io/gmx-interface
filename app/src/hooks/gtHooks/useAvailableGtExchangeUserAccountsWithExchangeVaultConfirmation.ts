import { GtExchangeAccounts } from '@/selectors/gt/types';
import { useMemo } from 'react';

import { useAvailableGtBanks } from './useAvailableGtBanks';
import { useAvailableGtExchangeUserAccounts } from './useAvailableGtExchangeUserAccounts';

export const useAvailableGtExchangeUserAccountWithExchangeVaultConfirmation =
  () => {
    const { gtExchangeUserAccounts, isLoading: isLoadingUserAccounts } =
      useAvailableGtExchangeUserAccounts();
    const { gtBanks, isLoading: isLoadingBanks } = useAvailableGtBanks();

    const confirmedUserAccounts = useMemo(() => {
      return Object.entries(gtExchangeUserAccounts).reduce(
        (acc, [address, userAccount]) => {
          const vaultAddress = userAccount.vault.toBase58();

          // Find corresponding bank for this vault
          const bank = Object.values(gtBanks).find(
            (bank) => bank.gtExchangeVault.toBase58() === vaultAddress
          );

          // Only include accounts where the bank exists
          if (bank) {
            acc[address] = userAccount;
          }

          return acc;
        },
        {} as GtExchangeAccounts
      );
    }, [gtExchangeUserAccounts, gtBanks]);

    return {
      isLoading: isLoadingUserAccounts || isLoadingBanks,
      gtExchangeUserAccounts: confirmedUserAccounts,
    };
  };
