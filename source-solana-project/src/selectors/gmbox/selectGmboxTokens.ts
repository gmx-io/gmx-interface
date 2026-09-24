import { createAppStoreSelector } from '@/zustand/useAppStore';
import { createStructuredSelector } from 'reselect';

import { selectGmboxFirstToken } from './selectGmboxFirstToken';
import { selectGmboxMarketOrGLvToken } from './selectGmboxMarketOrGlvToken';
import { selectGmboxSecondToken } from './selectGmboxSecondToken';

export const selectGmboxTokens = createStructuredSelector(
  {
    firstToken: selectGmboxFirstToken,
    secondToken: selectGmboxSecondToken,
    marketTokenOrGlvToken: selectGmboxMarketOrGLvToken,
  },
  createAppStoreSelector
);
