import { BN_ZERO } from '@/config/constants';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrderEditorFromToken } from './selectOrderEditorFromToken';
import { selectOrderEditorIsRatioInverted } from './selectOrderEditorIsRatioInverted';
import { selectOrderEditorTriggerRatio } from './selectOrderEditorTriggerRatio';
import { selectOrderEditorToToken } from './selectOrderEditorToToken';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { getTokenAmountByRatio } from '@/utils/token/getTokenAmountByRatio';

export const selectOrderEditorMinOutputAmount = createAppStoreSelector(
  [
    selectOrderEditorEditingOrder,
    selectOrderEditorFromToken,
    selectOrderEditorToToken,
    selectOrderEditorTriggerRatio,
    selectOrderEditorIsRatioInverted,
  ],
  (order, fromToken, toToken, triggerRatio, isRatioInverted) => {
    if (!order) return BN_ZERO;
    if (!fromToken) return BN_ZERO;
    if (!toToken) return BN_ZERO;

    let minOutputAmount = order.minOutputAmount;

    if (triggerRatio) {
      minOutputAmount = getTokenAmountByRatio({
        fromToken,
        toToken,
        fromTokenAmount: order.initialCollateralDeltaAmount,
        ratio: triggerRatio.ratio,
        shouldInvertRatio: !isRatioInverted,
      });

      const priceImpactAmount =
        convertUsdToTokenAmount(
          order.swapPathStats?.totalSwapPriceImpactDeltaUsd,
          order.targetCollateralToken.decimals,
          order.targetCollateralToken.prices.minPrice
        ) ?? BN_ZERO;

      const swapFeeAmount =
        convertUsdToTokenAmount(
          order.swapPathStats?.totalSwapFeeUsd,
          order.targetCollateralToken.decimals,
          order.targetCollateralToken.prices.minPrice
        ) ?? BN_ZERO;

      minOutputAmount = minOutputAmount
        .add(priceImpactAmount ?? BN_ZERO)
        .sub(swapFeeAmount ?? BN_ZERO);
    }

    return minOutputAmount;
  }
);
