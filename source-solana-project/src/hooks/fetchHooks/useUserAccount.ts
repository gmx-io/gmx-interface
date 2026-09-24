/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import { Address, translateAddress } from '@coral-xyz/anchor';
import { findUserPDA } from 'gmsol';
import { useMemo, useRef, useEffect, useState } from 'react';
import useSWR from 'swr';
import { getGmw404Enabled } from '@/config/featureFlagEnable';

export const USER_KEY = 'store_program/user';

export const useUserAccount = (store: Address | undefined) => {
  const storeProgram = useStoreProgram();
  const { owner } = useAnchor();
  
  const currentOwnerRef = useRef(owner?.toBase58());
  const [isOwnerChanging, setIsOwnerChanging] = useState(false);

  const request = useMemo(() => {
    if (!store || !owner) return null;

    return {
      key: USER_KEY,
      userAddress: findUserPDA(translateAddress(store), owner)[0].toBase58(),
      ownerKey: owner.toBase58(),
    };
  }, [owner, store]);

  useEffect(() => {
    const newOwnerKey = owner?.toBase58();
    if (currentOwnerRef.current !== newOwnerKey) {
      console.log('[useUserAccount] owner changed from', currentOwnerRef.current, 'to', newOwnerKey);
      setIsOwnerChanging(true);
      currentOwnerRef.current = newOwnerKey;
    }
  }, [owner]);

  const { isLoading, data, isValidating } = useSWR(
    request,
    async ({ userAddress }) => {
      try {
        const gmtradeAcc = await storeProgram.account.userHeader.fetch(userAddress);
        return gmtradeAcc;
      } catch (error) {
        // Account not created yet: return null (a defined value) instead of
        // undefined so SWR keeps `data` populated and `isLoading` doesn't flip
        // back to true on every refresh cycle, which made ReferralSetCard flicker.
        console.log('Get gmtrade Acc error :', error);
        return getGmw404Enabled() ? null : undefined;
      }
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      keepPreviousData: false,
    }
  );

  useEffect(() => {
    if (!isLoading && !isValidating && isOwnerChanging) {
      setIsOwnerChanging(false);
    }
  }, [isLoading, isValidating, isOwnerChanging]);

  return {
    isLoading: isLoading || isOwnerChanging,
    
    user: isOwnerChanging ? undefined : data,
  };
};
