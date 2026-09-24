import { createAppStoreSelector } from '@/zustand/useAppStore';
import { createStructuredSelector } from 'reselect';

import { selectGmboxFirstTokenUsd } from './selectGmboxFirstTokenUsd';
import { selectGmboxMarketOrGlvTokenUsd } from './selectGmboxMarketOrGlvTokenUsd';
import { selectGmboxSecondTokenUsd } from './selectGmboxSecondTokenUsd';

export const selectGmboxInputUsds = createStructuredSelector(
  {
    firstTokenUsd: selectGmboxFirstTokenUsd,
    secondTokenUsd: selectGmboxSecondTokenUsd,
    marketTokenOrGlvTokenUsd: selectGmboxMarketOrGlvTokenUsd,
  },
  createAppStoreSelector
);
