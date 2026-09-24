/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { GtExchangeVault } from '@/selectors/gt/types';
import { findGtExchangeVaultPDAWithDt } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

export const GT_EXCHANGE_VAULT_KEY = 'store_program/gt_exchange_vault';

export const useGtExchangeVault = () => {
  const storeProgram = useStoreProgram();
  const store = GMX_SOLANA_STORE_ADDRESS;

  // Memoize date and timeWindow
  const currentDate = useMemo(() => new Date(), []); // Only create once
  const timeWindow = useMemo(() => 86400, []); // Bigint constant

  // Memoize vault calculation with proper type assertion
  const vault = useMemo(() => {
    if (!store) return undefined;
    const [vaultPda] = findGtExchangeVaultPDAWithDt(
      store,
      currentDate,
      timeWindow
    );
    return vaultPda;
  }, [store, currentDate, timeWindow]);

  // Memoize request object
  const request = useMemo(() => {
    if (!vault) return null;
    return {
      key: GT_EXCHANGE_VAULT_KEY,
      gtExchangeVaultAddress: vault.toString(),
    };
  }, [vault]);

  const { isLoading, data } = useSWR(
    request,
    async ({ gtExchangeVaultAddress }) => {
      const rawVault = await storeProgram.account.gtExchangeVault.fetch(
        gtExchangeVaultAddress
      );

      if (!rawVault) return null;

      const gtExchangeVault: GtExchangeVault = {
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

      return gtExchangeVault;
    },
    {
      refreshInterval: 1000 * 5,
    }
  );

  return {
    isLoading,
    gtExchangeVault: data,
  };
};
