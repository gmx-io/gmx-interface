import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { isIncreaseOrderType } from '@/utils/order/isOrderType';
import { getTokenData } from '@/utils/token/getTokenData';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { getSwapPathOutputAddresses } from '@/utils/tradebox/getSwapPathOutputAddresses';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectTokensData } from '../token/selectTokensData';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';

export const selectOrderEditorToToken = createAppStoreSelector(
  [selectOrderEditorEditingOrder, selectMarketsInfo, selectTokensData],
  (order, marketsInfo, tokensData) => {
    if (!order) return undefined;

    const swapPathInfo = marketsInfo
      ? getSwapPathOutputAddresses({
          marketsInfo,
          initialCollateralAddress:
            order.initialCollateralTokenAddress.toBase58(),
          swapPath: order.primarySwapPath ?? [],
          wrappedNativeTokenAddress: WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58(),
          shouldUnwrapNativeToken: isNativeToken(
            order.targetCollateralToken.address.toBase58()
          ),
          isIncrease: isIncreaseOrderType(order.orderType),
        })
      : undefined;

    if (!swapPathInfo?.outTokenAddress) return undefined;

    return getTokenData(tokensData, swapPathInfo.outTokenAddress);
  }
);
