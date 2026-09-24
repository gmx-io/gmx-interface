import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import { GtExchangeAccount, GtExchangeAccounts } from '@/selectors/gt/types';
import { PublicKey } from '@solana/web3.js';
import { findGtExchangePDA } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

import { useAvailableGtExchangeVaults } from './useAvailableGtExchangeVaults';

export const AVAILABLE_GT_EXCHANGE_USER_ACCOUNTS_KEY =
  'store_program/available_gt_exchange_user_accounts';

export const useAvailableGtExchangeUserAccounts = () => {
  const { owner } = useAnchor();
  const storeProgram = useStoreProgram();
  const { gtExchangeVaults } = useAvailableGtExchangeVaults();

  // Memoize exchange addresses calculation
  const exchangeAddresses = useMemo(() => {
    if (!owner) return undefined;

    const addresses = Object.entries(gtExchangeVaults)
      .map(([vaultAddress]) => {
        try {
          const [address] = findGtExchangePDA(
            new PublicKey(vaultAddress),
            owner
          );
          return address;
        } catch {
          return null;
        }
      })
      .filter((address): address is PublicKey => address !== null);

    return addresses.length > 0 ? addresses : undefined;
  }, [owner, gtExchangeVaults]);

  // Memoize request object
  const request = useMemo(() => {
    if (!exchangeAddresses) return null;
    return {
      key: AVAILABLE_GT_EXCHANGE_USER_ACCOUNTS_KEY,
      exchangeAddresses: exchangeAddresses.map((address) => address.toString()),
    };
  }, [exchangeAddresses]);

  const { isLoading, data } = useSWR(request, async ({ exchangeAddresses }) => {
    const exchangePromises = exchangeAddresses.map(async (address) => {
      try {
        const rawExchange =
          await storeProgram.account.gtExchange.fetch(address);

        if (!rawExchange) return null;

        const exchange: GtExchangeAccount = {
          amount: rawExchange.amount,
          owner: rawExchange.owner,
          store: rawExchange.store,
          vault: rawExchange.vault,
        };

        return { address, exchange };
      } catch (error) {
        return null;
      }
    });

    const results = await Promise.all(exchangePromises);

    return results.reduce((acc, result) => {
      if (result) {
        acc[result.address] = result.exchange;
      }
      return acc;
    }, {} as GtExchangeAccounts);
  });

  return {
    isLoading,
    gtExchangeUserAccounts: data || {},
  };
};
