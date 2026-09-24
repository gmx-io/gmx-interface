import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectTokensData } from './selectTokensData';
import { getTokenData } from '@/utils/token/getTokenData';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';

export const selectWrappedNativeToken = createAppStoreSelector(
  [selectTokensData],
  (tokensData) => getTokenData(tokensData, WRAPPED_NATIVE_TOKEN_ADDRESS)
);
