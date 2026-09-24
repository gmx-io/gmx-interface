import { getSwapAmountsByFromValue } from '@/utils/tradebox/getSwapAmountsByFromValue';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';
import { selectTradeboxShouldSwap } from './selectTradeboxShouldSwap';
import { selectTradeboxReceiveToken } from './selectTradeboxReceiveToken';
import { selectTradeboxDecreasePositionAmounts } from './selectTradeboxDecreasePositionAmounts';
import { selectTradeboxFindSwapPathForReceiveToken } from './selectTradeboxFindSwapPathForReceiveToken';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';

export const selectTradeboxSwapAmountsForReceiveToken = createAppStoreSelector(
  [
    selectTradeboxSelectedPosition,
    selectTradeboxShouldSwap,
    selectTradeboxReceiveToken,
    selectTradeboxDecreasePositionAmounts,
    selectTradeboxFindSwapPathForReceiveToken,
    selectWrappedNativeToken,
  ],
  (
    position,
    shouldSwap,
    receiveToken,
    decreaseAmounts,
    findSwapPath,
    wrappedNativeToken
  ) => {
    if (!position) {
      return undefined;
    }

    if (
      !shouldSwap ||
      !receiveToken ||
      decreaseAmounts?.receiveTokenAmount === undefined ||
      !wrappedNativeToken
    ) {
      return undefined;
    }

    return getSwapAmountsByFromValue({
      tokenInRaw: position.collateralToken,
      tokenOutRaw: receiveToken,
      amountIn: decreaseAmounts.receiveTokenAmount,
      isLimit: false,
      findSwapPath,
      wrappedNativeToken,
    });
  }
);
