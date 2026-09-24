/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { GtExchangeVault, GtExchangeVaults } from '@/selectors/gt/types';
import { findGtExchangeVaultPDAWithDt } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

export const AVAILABLE_GT_EXCHANGE_VAULTS_KEY =
  'store_program/available_gt_exchange_vaults';

export const useAvailableGtExchangeVaults = () => {
  const storeProgram = useStoreProgram();
  const store = GMX_SOLANA_STORE_ADDRESS;

  // TODO: better to use a range of dates
  // Calculate dates for the past 365 days
  const dates = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      result.push(date);
    }
    return result;
  }, []);

  // Memoize timeWindow
  const timeWindow = useMemo(() => 86400, []); // 24 hours in seconds

  // Memoize vault calculations
  const vaults = useMemo(() => {
    if (!store) return undefined;
    return dates.map((date) => {
      const [vaultPda] = findGtExchangeVaultPDAWithDt(store, date, timeWindow);
      return vaultPda;
    });
  }, [store, dates, timeWindow]);

  // Memoize request object
  const request = useMemo(() => {
    if (!vaults) return null;
    return {
      key: AVAILABLE_GT_EXCHANGE_VAULTS_KEY,
      vaultAddresses: vaults.map((vault) => vault.toString()),
    };
  }, [vaults]);

  const { isLoading, data } = useSWR(request, async ({ vaultAddresses }) => {
    const vaultPromises = vaultAddresses.map(async (address) => {
      try {
        const rawVault =
          await storeProgram.account.gtExchangeVault.fetch(address);

        if (!rawVault) return null;

        const vault: GtExchangeVault = {
          bump: rawVault.bump,
          flags: {
            value: rawVault.flags.value,
          },
          padding: rawVault.padding,
          ts: rawVault.ts,
          timeWindow: rawVault.timeWindow,
          amount: rawVault.amount,
          store: rawVault.store,
        };

        return { address, vault };
      } catch (error) {
        return null;
      }
    });

    const results = await Promise.all(vaultPromises);

    // Convert array to object with address keys
    return results.reduce((acc, result) => {
      if (result) {
        acc[result.address] = result.vault;
      }
      return acc;
    }, {} as GtExchangeVaults);
  });

  return {
    isLoading,
    gtExchangeVaults: data || {},
  };
};
