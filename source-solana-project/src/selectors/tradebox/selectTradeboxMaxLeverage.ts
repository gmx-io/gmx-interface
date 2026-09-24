import { DEFAULT_MAX_LEVERAGE } from '@/config/factors';
import { getTradeMaxLeverage } from '@/utils/tradebox/getTradeMaxLeverage';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { selectMarketsState } from '../market/baseSelectors';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxMaxLeverage = createAppStoreSelector(
  [
    selectMarketsState,
    selectTradeboxMarketTokenAddress,
    selectTradeboxTradeFlags,
  ],
  (marketStates, marketTokenAddress, { isLong }): BN => {
    if (!marketTokenAddress) return DEFAULT_MAX_LEVERAGE;

    const marketState = marketStates[marketTokenAddress];
    if (!marketState) return DEFAULT_MAX_LEVERAGE;

    const openInterest = isLong
      ? marketState.openInterestForLongLongTokenAmount.add(
          marketState.openInterestForLongShortTokenAmount
        )
      : marketState.openInterestForShortLongTokenAmount.add(
          marketState.openInterestForShortShortTokenAmount
        );

    return getTradeMaxLeverage(
      marketState.minCollateralFactor,
      isLong
        ? marketState.minCollateralFactorForOpenInterestMultiplierForLong
        : marketState.minCollateralFactorForOpenInterestMultiplierForShort,
      openInterest
    );
  }
);
