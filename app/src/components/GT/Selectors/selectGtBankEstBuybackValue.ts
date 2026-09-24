import { BN_ZERO } from '@/config/constants';
import { getUnit } from '@/utils/legacy/common';
import { selectGtBankBuybackPrice } from '@/selectors/gt/selectGtBankBuybackPrice';
import { selectGtExchangeVaultAmount } from '@/selectors/gt/gtExchangeVaultSelectors';
import { BN } from '@coral-xyz/anchor';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectGtGlobalDetailsDecimals } from '@/selectors/gt/gtGlobalDetailsSelectors';
import { getGmw406Enabled, getGmw410Enabled } from '@/config/featureFlagEnable';

export const selectGtBankEstBuybackValue = createAppStoreSelector(
  [
    selectGtExchangeVaultAmount,
    selectGtBankBuybackPrice,
    selectGtGlobalDetailsDecimals,
  ],
  (depositedGTAmount, buybackPrice, gtDecimals): BN => {
    if (
      !depositedGTAmount ||
      depositedGTAmount.isZero() ||
      !buybackPrice ||
      buybackPrice.isZero()
    ) {
      return BN_ZERO;
    }

    return depositedGTAmount
      .mul(buybackPrice)
      .div(getUnit(getGmw406Enabled() && !getGmw410Enabled() ? gtDecimals : 7));
  }
);
