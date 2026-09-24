import { ONE_BPS } from '@/config/constants';
import { HIGH_SPREAD_THRESHOLD } from '@/config/factors';
import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { getSpread } from '@/utils/token/getSpread';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { selectTradeboxMarketInfo } from './selectTradeboxMarketInfo';
import { selectTradeboxCollateralToken } from './selectTradeboxCollateralToken';
import { selectSavedAllowedSlippage } from '../setting/baseSelectors';

export const selectTradeboxCollateralSpreadInfo = createAppStoreSelector(
  [
    selectTradeboxMarketInfo,
    selectTradeboxCollateralToken,
    selectSavedAllowedSlippage,
  ],
  (marketInfo, collateralToken, savedAllowedSlippage) => {
    const { indexToken } = marketInfo ?? {};

    if (!indexToken || !collateralToken) {
      return undefined;
    }

    let totalSpread = getSpread(indexToken.prices);

    if (getIsEquivalentTokens(collateralToken, indexToken)) {
      return {
        spread: totalSpread,
        isHigh: totalSpread.gt(new BN(HIGH_SPREAD_THRESHOLD).mul(ONE_BPS)), // 100%
      };
    }

    totalSpread = totalSpread.add(getSpread(collateralToken.prices));

    return {
      spread: totalSpread,
      isHigh: totalSpread.gt(new BN(HIGH_SPREAD_THRESHOLD).mul(ONE_BPS)), // 100%
      isHigherThanSavedAllowedSlippage: totalSpread.gt(
        new BN(savedAllowedSlippage).mul(ONE_BPS)
      ),
    };
  }
);
