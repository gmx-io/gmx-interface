import { selectGtGlobalDetailsDecimals } from './gtGlobalDetailsSelectors';

import { getUnit } from '@/utils/legacy/common';
import { selectGtGlobalDetailsMintingCostRaw } from './gtGlobalDetailsSelectors';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGtMintingCost = createAppStoreSelector(
  [selectGtGlobalDetailsMintingCostRaw, selectGtGlobalDetailsDecimals],
  (mintingCostRaw, gtDecimals): BN => {
    if (!mintingCostRaw || !gtDecimals) return BN_ZERO;
    return mintingCostRaw.mul(getUnit(gtDecimals)) ?? BN_ZERO;
  }
);
