import { BN_ZERO } from '@solana/spl-governance/lib/tools/numbers';
import { selectGtBankEstBuybackValue } from './selectGtBankEstBuybackValue';
import { selectGtExchangeVaultAmount } from './gtExchangeVaultSelectors';
import { selectGtExchangeUserAccountAmount } from './gtUserAccountSelectors';
import { BN } from '@coral-xyz/anchor';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGtExchangeUserPendingClaimableValue = createAppStoreSelector(
  [
    selectGtExchangeUserAccountAmount,
    selectGtExchangeVaultAmount,
    selectGtBankEstBuybackValue,
  ],
  (userDepositedGTAmount, depositedGTAmount, estBuybackValue): BN => {
    if (
      !depositedGTAmount ||
      !userDepositedGTAmount ||
      depositedGTAmount.isZero()
    ) {
      return BN_ZERO;
    }

    return estBuybackValue.mul(userDepositedGTAmount).div(depositedGTAmount);
  }
);
