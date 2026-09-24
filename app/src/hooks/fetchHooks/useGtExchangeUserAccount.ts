/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { DEFAULT_SWR_REFRESH_INTERVAL_5S } from '@/config/ui';
import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import { GtExchangeAccount } from '@/selectors/gt/types';
import { findGtExchangePDA, findGtExchangeVaultPDAWithDt } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

export const GT_EXCHANGE_USER_ACCOUNT_KEY =
  'store_program/gt_exchange_user_account';

export const useGtExchangeUserAccount = () => {
  const { owner } = useAnchor();
  const storeProgram = useStoreProgram();
  const store = GMX_SOLANA_STORE_ADDRESS;

  // Memoize constants
  const timeWindow = useMemo(() => 86400, []);
  const currentDate = useMemo(() => new Date(), []);

  // Memoize vault calculation
  const vault = useMemo(() => {
    if (!store) return undefined;
    return findGtExchangeVaultPDAWithDt(store, currentDate, timeWindow)[0];
  }, [store, currentDate, timeWindow]);

  // Memoize exchange address calculation
  const exchangeAddress = useMemo(() => {
    if (!vault || !owner) return undefined;
    const [address] = findGtExchangePDA(vault, owner);
    return address;
  }, [vault, owner]);

  // Memoize request object
  const request = () => {
    if (!exchangeAddress) return null;
    return {
      key: GT_EXCHANGE_USER_ACCOUNT_KEY,
      gtExchangeUserAccountAddress: exchangeAddress.toString(),
    };
  };
  // Memoize data transformation function
  const { isLoading, data } = useSWR(
    request,
    async ({
      gtExchangeUserAccountAddress,
    }: {
      gtExchangeUserAccountAddress: string;
    }) => {
      try {
        const rawExchange = await storeProgram.account.gtExchange.fetch(
          gtExchangeUserAccountAddress
        );
        if (!rawExchange) return null;

        const gtExchange: GtExchangeAccount = {
          amount: rawExchange.amount,
          owner: rawExchange.owner,
          store: rawExchange.store,
          vault: rawExchange.vault,
        };

        return gtExchange;
      } catch (error) {
        console.error('Error fetching GT exchange user account:', error);
        return null;
      }
    },
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_5S,
    }
  );

  return {
    isLoading,
    gtExchangeUserAccount: data,
  };
};
