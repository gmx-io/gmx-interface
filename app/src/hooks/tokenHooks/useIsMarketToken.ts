import { selectMarketTokensData } from '@/selectors/token/selectMarketTokensData';
import { Token } from '@/selectors/token/types';
import { isMarketToken } from '@/utils/token/isMarketToken';
import { useAppStore } from '@/zustand/useAppStore';

export function useIsMarketToken(token?: Token): boolean {
  const marketTokensData = useAppStore(selectMarketTokensData);

  if (!marketTokensData || !token) {
    return false;
  }

  return isMarketToken(token, marketTokensData);
}
