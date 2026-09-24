import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getUnit } from '@/utils/legacy/common';
import { BN_ZERO } from '@solana/spl-governance/lib/tools/numbers';
import { selectGtGlobalDetailsDecimals } from './gtGlobalDetailsSelectors';
import { selectGtMintingCost } from './selectGtMintingCost';
import { selectGtBankMaxBuybackValue } from './selectGtBankMaxBuybackValue';
import { BN } from '@coral-xyz/anchor';

export const selectGtExchangeVaultRecommendedDepositedAmount =
  createAppStoreSelector(
    [
      selectGtBankMaxBuybackValue,
      selectGtMintingCost,
      selectGtGlobalDetailsDecimals,
    ],
    (maxBuybackValue, mintingCost, gtDecimals): BN => {
      if (
        !maxBuybackValue ||
        maxBuybackValue.isZero() ||
        !mintingCost ||
        mintingCost.isZero()
      ) {
        return BN_ZERO;
      }

      return maxBuybackValue.mul(getUnit(gtDecimals)).div(mintingCost);
    }
  );
