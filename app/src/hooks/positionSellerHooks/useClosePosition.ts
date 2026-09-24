import { selectSetPositionSellerAddress } from '@/selectors/positionSeller/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { Address } from '@coral-xyz/anchor';
import { useCallback } from 'react';

export const useClosePosition = () => {
  const setPositionSellerAddress = useAppStore(selectSetPositionSellerAddress);
  return useCallback(
    (address: Address) => setPositionSellerAddress(address),
    [setPositionSellerAddress]
  );
};
