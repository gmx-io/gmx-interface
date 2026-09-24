import { parseValue } from '@/utils/legacy/parse';
import { selectGmboxSecondInputValue } from './baseSelectors';
import { selectGmboxSecondToken } from './selectGmboxSecondToken';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGmboxSecondTokenAmount = createAppStoreSelector(
  [selectGmboxSecondInputValue, selectGmboxSecondToken],
  (value, token) => {
    if (!token?.decimals) return undefined;
    return parseValue(value, token.decimals);
  }
);
