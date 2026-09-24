import { getUnit } from '@/utils/legacy/common';
import { selectGtGlobalDetailsDecimals } from './gtGlobalDetailsSelectors';
import { selectGtMintingCost } from './selectGtMintingCost';
import { BN_ZERO } from '@/config/constants';
import { selectGtBankMaxBuybackValue } from './selectGtBankMaxBuybackValue';
import { selectGtExchangeVaultAmount } from './gtExchangeVaultSelectors';
import { BN } from '@coral-xyz/anchor';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import {
  getGmw406Enabled,
  getGmw410Enabled,
} from '@/config/featureFlagEnable';

export const selectGtBankBuybackPrice = createAppStoreSelector(
  [
    selectGtExchangeVaultAmount,
    selectGtBankMaxBuybackValue,
    selectGtMintingCost,
    selectGtGlobalDetailsDecimals,
  ],
  (depositedGTAmount, maxBuybackValue, mintingCost, gtDecimals): BN => {
    if (!depositedGTAmount || depositedGTAmount.isZero()) return mintingCost;
    if (!maxBuybackValue || maxBuybackValue.isZero()) return BN_ZERO;
    const buybackPrice = maxBuybackValue
      .mul(getUnit(getGmw406Enabled() && !getGmw410Enabled() ? gtDecimals : 7))
      .div(depositedGTAmount);

    return buybackPrice.gt(mintingCost) ? mintingCost : buybackPrice;
  }
);
