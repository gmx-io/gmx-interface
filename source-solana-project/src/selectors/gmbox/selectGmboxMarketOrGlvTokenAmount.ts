import { parseValue } from '@/utils/legacy/parse';
import { selectGmboxMarketOrGLvTokenInputValue } from '@/selectors/gmbox/baseSelectors';
import { selectGmboxMarketOrGLvToken } from '@/selectors/gmbox/selectGmboxMarketOrGlvToken';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGmboxMarketOrGlvTokenAmount = createAppStoreSelector(
  [selectGmboxMarketOrGLvTokenInputValue, selectGmboxMarketOrGLvToken],
  (value, token) => {
    if (!token?.decimals) return undefined;
    return parseValue(value, token.decimals);
  }
);
