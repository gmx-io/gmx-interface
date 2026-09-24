import {
  selectGtGlobalDetailsMintingCostRaw,
  selectGtGlobalDetailsTotalMintedAmount,
} from '@/selectors/gt/gtGlobalDetailsSelectors';
import { selectGtBankMaxBuybackValue } from '@/selectors/gt/selectGtBankMaxBuybackValue';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

/**
 * Calculates the annualized buyback APR based on max buyback value and total minted GT
 * Formula: maxBuybackValue * 365 / (totalMintedGt * mintingCostRaw)
 * Returns a BN value that represents the APR percentage * 10000 (for 2 decimal points of precision)
 */
export const selectGtBuybackApr = createAppStoreSelector(
  [
    selectGtBankMaxBuybackValue,
    selectGtGlobalDetailsTotalMintedAmount,
    selectGtGlobalDetailsMintingCostRaw,
  ],
  (maxBuybackValue, totalMintedGt, mintingCostRaw): number => {
    if (
      !maxBuybackValue ||
      !totalMintedGt ||
      !mintingCostRaw ||
      totalMintedGt.isZero()
    ) {
      return 0;
    }

    // APR = maxBuybackValue * 365 / (totalMintedGt * mintingCostRaw)
    // Multiply by 10000 to get percentage with 2 decimals
    return maxBuybackValue
      .mul(new BN(365 * 10000))
      .div(totalMintedGt.mul(mintingCostRaw))
      .toNumber();
  }
);
