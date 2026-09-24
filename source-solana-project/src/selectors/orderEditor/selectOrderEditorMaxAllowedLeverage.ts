import { BN_TWO } from '@/config/constants';
import { getTradeMaxLeverage } from '@/utils/tradebox/getTradeMaxLeverage';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { DEFAULT_MAX_LEVERAGE } from '@/config/factors';

export const selectOrderEditorMaxAllowedLeverage = createAppStoreSelector(
  [selectOrderEditorEditingOrder, selectMarketsInfo],
  (order, marketsInfoData) => {
    if (!order) return DEFAULT_MAX_LEVERAGE;
    const maxAllowedLeverage = getTradeMaxLeverage(
      marketsInfoData?.[order.marketTokenAddress.toBase58()]
        ?.minCollateralFactor,
      order.isLong
        ? marketsInfoData?.[order.marketTokenAddress.toBase58()]
            ?.minCollateralFactorForOpenInterestMultiplierForLong
        : marketsInfoData?.[order.marketTokenAddress.toBase58()]
            ?.minCollateralFactorForOpenInterestMultiplierForShort,
      order.isLong
        ? marketsInfoData?.[
            order.marketTokenAddress.toBase58()
          ]?.openInterestForLongLongTokenAmount.add(
            marketsInfoData?.[order.marketTokenAddress.toBase58()]
              ?.openInterestForLongShortTokenAmount
          )
        : marketsInfoData?.[
            order.marketTokenAddress.toBase58()
          ]?.openInterestForShortLongTokenAmount.add(
            marketsInfoData?.[order.marketTokenAddress.toBase58()]
              ?.openInterestForShortShortTokenAmount
          )
    ).div(BN_TWO);
    return maxAllowedLeverage;
  }
);
