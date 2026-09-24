import { BN_10000, BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPaidFeeValue } from './gtUserDetailsSelectors';
import { selectGtUserDetailsTotalMinted } from './gtUserDetailsSelectors';
import { selectGtGlobalDetailsMintingCostRaw } from './gtGlobalDetailsSelectors';
import { BN } from '@coral-xyz/anchor';

export const selectGtGrowthSinceGenesisForUser = createAppStoreSelector(
  [
    selectGtUserDetailsTotalMinted,
    selectGtGlobalDetailsMintingCostRaw,
    selectPaidFeeValue,
  ],
  (userTotalMinted, mintingCostRaw, paidFeeValue): BN => {
    if (paidFeeValue.isZero()) {
      return BN_ZERO;
    }

    const userTotalReturn = userTotalMinted
      .mul(mintingCostRaw)
      .sub(paidFeeValue);
    return userTotalReturn.mul(BN_10000).div(paidFeeValue);
  }
);
