import { createAppStoreSelector } from '@/zustand/useAppStore';
import { createStructuredSelector } from 'reselect';

import { selectGmboxFirstTokenAmount } from './selectGmboxFirstTokenAmount';
import { selectGmboxMarketOrGlvTokenAmount } from './selectGmboxMarketOrGlvTokenAmount';
import { selectGmboxSecondTokenAmount } from './selectGmboxSecondTokenAmount';

export const selectGmboxInputAmounts = createStructuredSelector(
  {
    firstTokenAmount: selectGmboxFirstTokenAmount,
    secondTokenAmount: selectGmboxSecondTokenAmount,
    marketTokenOrGlvTokenAmount: selectGmboxMarketOrGlvTokenAmount,
  },
  createAppStoreSelector
);
