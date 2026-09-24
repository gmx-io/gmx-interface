import { BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import {
  selectGtGlobalDetailsGrowStepAmount,
  selectGtGlobalDetailsTotalMintedAmount,
} from './gtGlobalDetailsSelectors';

export const selectGtCycleRemainderAmount = createAppStoreSelector(
  [selectGtGlobalDetailsTotalMintedAmount, selectGtGlobalDetailsGrowStepAmount],
  (totalMinted, growStepAmount) => {
    if (growStepAmount.isZero()) {
      return BN_ZERO;
    }

    return totalMinted.mod(growStepAmount);
  }
);
