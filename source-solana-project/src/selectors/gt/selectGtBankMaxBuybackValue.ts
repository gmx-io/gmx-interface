import { BN_ZERO, ONE_USD } from '@/config/constants';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import {
  selectGtBankBuybackFactor,
  selectGtBankTokenBalances,
  selectGtTokenPriceMap,
  selectGtTreasuryValue,
} from './gtBankSelectors';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';

export const selectGtBankMaxBuybackValue = createAppStoreSelector(
  [
    selectGtBankTokenBalances,
    selectGtTreasuryValue,
    selectGtBankBuybackFactor,
    selectGtTokenPriceMap,
  ],
  (balances, treasuryValue, buybackFactor, tokenPriceMap): BN => {
    if (!balances?.data?.length) return BN_ZERO;
    // Calculate raw buyback value from token balances
    const rawBuybackValue = balances.data.reduce((totalValue, balance) => {
      const decimals = GMX_SOLANA_TOKENS_RAW[balance.key]?.decimals || 0;
      const tokenPrice = tokenPriceMap?.get(balance.key)?.price || BN_ZERO;
      if (!tokenPrice) return totalValue;
      return totalValue.add(
        convertTokenAmountToUsd(
          balance.value.amount,
          decimals,
          new BN(tokenPrice)
        )
      );
    }, BN_ZERO);
    // Calculate max buyback value based on treasury value and buyback factor
    const treasuryMaxBuybackValue = treasuryValue
      .add(rawBuybackValue)
      .mul(buybackFactor)
      .div(ONE_USD);
    return BN.min(rawBuybackValue, treasuryMaxBuybackValue);
  }
);
