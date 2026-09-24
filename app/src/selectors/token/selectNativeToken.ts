import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectTokensData } from './selectTokensData';
import { getTokenData } from '@/utils/token/getTokenData';
import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';

export const selectNativeToken = createAppStoreSelector(
  [selectTokensData],
  (tokensData) => getTokenData(tokensData, NATIVE_TOKEN_ADDRESS)
);
