import { createStructuredSelector } from 'reselect';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectGmboxInputUsds } from './selectGmboxInputUsds';
import { selectGmboxInputAmounts } from './selectGmboxInputAmounts';
import { selectGmboxTokens } from './selectGmboxTokens';

export const selectGmboxParams = createStructuredSelector(
  {
    tokens: selectGmboxTokens,
    amounts: selectGmboxInputAmounts,
    usds: selectGmboxInputUsds,
  },
  createAppStoreSelector
);
