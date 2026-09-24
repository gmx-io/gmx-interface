import { makeSelectOrderErrorByOrderAddress } from '@/selectors/order/makeSelectOrderErrorByOrderAddress';
import { useAppStore } from '@/zustand/useAppStore';

export const useOrderErrors = (orderAddress: string) => {
  const selector = makeSelectOrderErrorByOrderAddress(orderAddress);
  return useAppStore(selector);
};
