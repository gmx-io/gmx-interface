import { getExecutionFee } from '@/utils/fee/getExecutionFee';

import { BASIS_POINTS_DIVISOR_BN, BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerDecreaseAmounts } from './selectPositionSellerDecreaseAmounts';
import { selectPositionSellerSwapAmounts } from './selectPositionSellerSwapAmounts';
import { selectTokensData } from '../token/selectTokensData';
import { getTradeFees } from '@/utils/fee/getTradeFees';

export const selectPositionSellerFees = createAppStoreSelector(
  [
    selectPositionSellerClosingPosition,
    selectPositionSellerDecreaseAmounts,
    selectPositionSellerSwapAmounts,
    selectTokensData,
  ],
  (position, decreaseAmounts, swapAmounts, tokensData) => {
    if (!position || !decreaseAmounts || !tokensData) {
      return {};
    }

    const gasLimits = {
      depositSingleToken: BN_ZERO,
      depositMultiToken: BN_ZERO,
      withdrawalMultiToken: BN_ZERO,
      shift: BN_ZERO,
      singleSwap: BN_ZERO,
      swapOrder: BN_ZERO,
      increaseOrder: BN_ZERO,
      decreaseOrder: BN_ZERO,
      estimatedGasFeeBaseAmount: BN_ZERO,
      estimatedGasFeePerOraclePrice: BN_ZERO,
      estimatedFeeMultiplierFactor: BN_ZERO,
      glvDepositGasLimit: BN_ZERO,
      glvWithdrawalGasLimit: BN_ZERO,
      glvPerMarketGasLimit: BN_ZERO,
    };

    const sizeReductionBps = decreaseAmounts.sizeDeltaUsd
      .mul(BASIS_POINTS_DIVISOR_BN)
      .div(position.sizeInUsd);
    const collateralDeltaUsd = position.collateralUsd
      .mul(sizeReductionBps)
      .div(BASIS_POINTS_DIVISOR_BN);

    return {
      fees: getTradeFees({
        initialCollateralUsd: position.collateralUsd,
        collateralDeltaUsd,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        swapSteps: swapAmounts?.swapPathStats?.swapSteps || [],
        positionFeeUsd: decreaseAmounts.positionFeeUsd,
        feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
        swapPriceImpactDeltaUsd:
          swapAmounts?.swapPathStats?.totalSwapPriceImpactDeltaUsd || BN_ZERO,
        positionPriceImpactDeltaUsd:
          decreaseAmounts.positionPriceImpactDeltaUsd,
        priceImpactDiffUsd: decreaseAmounts.priceImpactDiffUsd,
        borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
        fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
        swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
        gtRewardsUsd: decreaseAmounts.gtRewardsUsd,
        GtEnabled: position.marketInfo.GtEnabled,
      }),
      executionFee: getExecutionFee(
        gasLimits,
        tokensData,
        BN_ZERO,
        BN_ZERO,
        BN_ZERO
      ),
    };
  }
);
