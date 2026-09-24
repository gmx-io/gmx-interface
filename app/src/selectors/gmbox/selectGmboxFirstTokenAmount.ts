import { selectGmboxFirstInputValue } from './baseSelectors';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectGmboxFirstToken } from './selectGmboxFirstToken';
import { parseValue } from '@/utils/legacy/parse';

export const selectGmboxFirstTokenAmount = createAppStoreSelector(
  [selectGmboxFirstInputValue, selectGmboxFirstToken],
  (value, token) => {
    if (!token?.decimals) return undefined;
    return parseValue(value, token.decimals);
  }
);
