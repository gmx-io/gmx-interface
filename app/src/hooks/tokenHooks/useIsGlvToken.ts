import { selectGlvTokensData } from '@/selectors/token/selectGlvTokensData';
import { Token } from '@/selectors/token/types';
import { isGlvToken } from '@/utils/token/isGlvToken';
import { useAppStore } from '@/zustand/useAppStore';

export function useIsGlvToken(token?: Token): boolean {
  const glvTokensData = useAppStore(selectGlvTokensData);

  if (!glvTokensData || !token) {
    return false;
  }

  return isGlvToken(token, glvTokensData);
}
