import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { selectGtBankTokenBalances } from './gtBankSelectors';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGtBankTokenAddresses = createAppStoreSelector(
  [selectGtBankTokenBalances],
  (balances): string[] => {
    const data = balances?.data;
    if (!data?.length) return [];

    const nativeAddress = NATIVE_TOKEN_ADDRESS.toBase58();
    return data.reduce((acc: string[], item) => {
      if (item.key !== nativeAddress) {
        acc.push(item.key);
      }
      return acc;
    }, []);
  }
);
