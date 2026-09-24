import { BN_ZERO } from '@/config/constants';
import { getUnit } from '@/utils/legacy/common';
import { selectGtGlobalDetailsDecimals } from './gtGlobalDetailsSelectors';
import { selectGtBankBuybackPrice } from './selectGtBankBuybackPrice';
import { selectGtExchangeVaultAmount } from './gtExchangeVaultSelectors';
import { BN } from '@coral-xyz/anchor';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGtBankEstBuybackValue = createAppStoreSelector(
  [
    selectGtExchangeVaultAmount,
    selectGtBankBuybackPrice,
    selectGtGlobalDetailsDecimals,
  ],
  (depositedGTAmount, buybackPrice, gtDecimals): BN => {
    // console.log('depositedGTAmount', depositedGTAmount?.toString());
    // console.log('buybackPrice', buybackPrice?.toString());
    // console.log('gtDecimals', gtDecimals);
    if (
      !depositedGTAmount ||
      depositedGTAmount.isZero() ||
      !buybackPrice ||
      buybackPrice.isZero()
    ) {
      return BN_ZERO;
    }

    return depositedGTAmount.mul(buybackPrice).div(getUnit(gtDecimals));
  }
);
