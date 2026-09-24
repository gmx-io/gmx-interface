import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTradeFeesType } from './selectTradeboxTradeFeesType';
import { selectTradeboxSwapAmounts } from './selectTradeboxSwapAmounts';
import { selectTradeboxIncreasePositionAmounts } from './selectTradeboxIncreasePositionAmounts';
import { selectTradeboxDecreasePositionAmounts } from './selectTradeboxDecreasePositionAmounts';
import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';
import { TradeFees } from '@/selectors/fee/types';
import { BN_ZERO } from '@/config/constants';
import { getTradeFees } from '@/utils/fee/getTradeFees';
import { mustNeverExist } from '@/utils/lib/assertions';
import { selectTradeboxMarketInfo } from './selectTradeboxMarketInfo';

export const selectTradeboxTradeFees = createAppStoreSelector(
  [
    selectTradeboxTradeFeesType,
    selectTradeboxSwapAmounts,
    selectTradeboxIncreasePositionAmounts,
    selectTradeboxDecreasePositionAmounts,
    selectTradeboxSelectedPosition,
    selectTradeboxMarketInfo,
  ],
  (
    tradeFeesType,
    swapAmounts,
    increaseAmounts,
    decreaseAmounts,
    selectedPosition,
    marketInfo
  ): TradeFees | undefined => {
    if (!tradeFeesType) return undefined;

    switch (tradeFeesType) {
      case 'swap': {
        if (!swapAmounts || !swapAmounts.swapPathStats) return undefined;

        return getTradeFees({
          initialCollateralUsd: swapAmounts.usdIn,
          collateralDeltaUsd: BN_ZERO,
          sizeDeltaUsd: BN_ZERO,
          swapSteps: swapAmounts.swapPathStats.swapSteps,
          positionFeeUsd: BN_ZERO,
          swapPriceImpactDeltaUsd:
            swapAmounts.swapPathStats.totalSwapPriceImpactDeltaUsd,
          positionPriceImpactDeltaUsd: BN_ZERO,
          priceImpactDiffUsd: BN_ZERO,
          borrowingFeeUsd: BN_ZERO,
          fundingFeeUsd: BN_ZERO,
          swapProfitFeeUsd: BN_ZERO,
          feeDiscountUsd: BN_ZERO,
          gtRewardsUsd: BN_ZERO,
          GtEnabled: marketInfo?.GtEnabled || false,
        });
      }
      case 'increase': {
        if (!increaseAmounts) return undefined;

        return getTradeFees({
          initialCollateralUsd: increaseAmounts.initialCollateralUsd,
          collateralDeltaUsd: increaseAmounts.initialCollateralUsd,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          swapSteps: increaseAmounts.swapPathStats?.swapSteps || [],
          positionFeeUsd: increaseAmounts.positionFeeUsd,
          swapPriceImpactDeltaUsd:
            increaseAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd ||
            BN_ZERO,
          positionPriceImpactDeltaUsd:
            increaseAmounts.positionPriceImpactDeltaUsd,
          priceImpactDiffUsd: BN_ZERO,
          borrowingFeeUsd: selectedPosition?.pendingBorrowingFeesUsd || BN_ZERO,
          fundingFeeUsd: selectedPosition?.pendingFundingFeesUsd || BN_ZERO,
          swapProfitFeeUsd: BN_ZERO,
          feeDiscountUsd: increaseAmounts.feeDiscountUsd,
          gtRewardsUsd: increaseAmounts.gtRewardsUsd,
          GtEnabled: marketInfo?.GtEnabled || false,
        });
      }
      case 'decrease': {
        if (
          !decreaseAmounts ||
          !selectedPosition ||
          selectedPosition.sizeInUsd.isZero()
        )
          return undefined;

        const collateralDeltaUsd = selectedPosition.collateralUsd
          .mul(decreaseAmounts.sizeDeltaUsd)
          .div(selectedPosition.sizeInUsd);

        return getTradeFees({
          initialCollateralUsd: selectedPosition.collateralUsd || BN_ZERO,
          collateralDeltaUsd,
          sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
          swapSteps: [],
          positionFeeUsd: decreaseAmounts.positionFeeUsd,
          swapPriceImpactDeltaUsd: BN_ZERO,
          positionPriceImpactDeltaUsd:
            decreaseAmounts.positionPriceImpactDeltaUsd,
          priceImpactDiffUsd: decreaseAmounts.priceImpactDiffUsd,
          borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
          fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
          swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
          feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
          gtRewardsUsd: decreaseAmounts.gtRewardsUsd,
          GtEnabled: marketInfo?.GtEnabled || false,
        });
      }
      case 'edit':
        return undefined;
      default:
        throw mustNeverExist(tradeFeesType);
    }
  }
);
