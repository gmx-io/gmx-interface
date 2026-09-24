import { useStoreProgram } from '@/contexts/anchor';
import { Address } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import useSWR from 'swr';

export const STORE_KEY = 'store_program/store';

export const useStoreAccount = (store: Address | undefined) => {
  const storeProgram = useStoreProgram();
  const request = useMemo(() => {
    if (!store) return null;

    return {
      key: STORE_KEY,
      storeAddress: store.toString(),
    };
  }, [store]);

  const { isLoading, data } = useSWR(request, async ({ storeAddress }) => {
    return await storeProgram.account.store.fetch(storeAddress);
  });

  return {
    isLoading,
    store: data,
  };
};
