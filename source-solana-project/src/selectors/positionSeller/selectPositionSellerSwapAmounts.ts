import { getSwapAmountsByFromValue } from '@/utils/tradebox/getSwapAmountsByFromValue';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerShouldSwap } from './selectPositionSellerShouldSwap';
import { selectPositionSellerReceiveToken } from './selectPositionSellerReceiveToken';
import { selectPositionSellerDecreaseAmounts } from './selectPositionSellerDecreaseAmounts';
import { selectPositionSellerFindSwapPath } from './selectPositionSellerFindSwapPath';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';

export const selectPositionSellerSwapAmounts = createAppStoreSelector(
  [
    selectPositionSellerClosingPosition,
    selectPositionSellerShouldSwap,
    selectPositionSellerReceiveToken,
    selectPositionSellerDecreaseAmounts,
    selectPositionSellerFindSwapPath,
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
