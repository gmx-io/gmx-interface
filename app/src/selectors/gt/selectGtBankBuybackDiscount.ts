import { getBasisPoints } from '@/utils/legacy/common';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN_ZERO } from '@solana/spl-governance/lib/tools/numbers';

import { selectGtExchangeVaultAmount } from './gtExchangeVaultSelectors';
import { selectGtBankBuybackPrice } from './selectGtBankBuybackPrice';
import { selectGtExchangeVaultRecommendedDepositedAmount } from './selectGtExchangeVaultRecommendedDepositedAmount';
import { selectGtMintingCost } from './selectGtMintingCost';

export const selectGtBankBuybackDiscount = createAppStoreSelector(
  [
    selectGtMintingCost,
    selectGtBankBuybackPrice,
    selectGtExchangeVaultRecommendedDepositedAmount,
    selectGtExchangeVaultAmount,
  ],
  (
    mintingCost,
    buybackPrice,
    recommendedGtAmountWithoutDiscount,
    depositedGTAmount
  ): number => {
    // Return 0 if no GT is deposited or no minting cost
    if (!mintingCost?.gt(BN_ZERO) || !depositedGTAmount?.gt(BN_ZERO)) {
      return 0;
    }

    // Return -100% discount if buyback price is 0 or recommended amount is 0
    if (
      !buybackPrice?.gt(BN_ZERO) ||
      !recommendedGtAmountWithoutDiscount?.gt(BN_ZERO)
    ) {
      return -10000;
    }

    return getBasisPoints(buybackPrice.sub(mintingCost), mintingCost, false);
  }
);
