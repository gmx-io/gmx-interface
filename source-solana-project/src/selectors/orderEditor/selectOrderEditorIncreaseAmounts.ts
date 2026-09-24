import { BN_ZERO } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { OrderType, PositionOrderInfo } from '@/selectors/order/types';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import { isLimitOrderType } from '@/utils/order/isOrderType';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { getIncreasePositionAmounts } from '@/utils/tradebox/getIncreasePositionAmounts';
import { getSwapBestPath } from '@/utils/tradebox/getSwapBestPath';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectUserOrderFeeDiscountFactor } from '../referral/selectUserOrderFeeDiscountFactor';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import { selectSwapEstimator } from '../trade/selectSwapEstimator';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { selectOrderEditorExistingPosition } from './selectOrderEditorExistingPosition';
import { selectOrderEditorFromToken } from './selectOrderEditorFromToken';
import { selectOrderEditorSizeDeltaUsd } from './selectOrderEditorSizeDeltaUsd';
import { selectOrderEditorToToken } from './selectOrderEditorToToken';
import { selectOrderEditorTriggerPrice } from './selectOrderEditorTriggerPrice';

export const selectOrderEditorIncreaseAmounts = createAppStoreSelector(
  [
    selectOrderEditorEditingOrder,
    selectOrderEditorToToken,
    selectOrderEditorFromToken,
    selectMarketsInfo,
    selectOrderEditorTriggerPrice,
    selectOrderEditorExistingPosition,
    selectOrderEditorSizeDeltaUsd,
    selectSwapGraph,
    selectSwapEstimator,
    selectUserOrderFeeDiscountFactor,
    selectWrappedNativeToken,
  ],
  (
    order,
    toToken,
    fromToken,
    marketsInfo,
    triggerPrice,
    existingPosition,
    sizeDeltaUsd,
    marketsGraph,
    swapEstimator,
    { userOrderFeeDiscountFactor },
    wrappedNativeToken
  ) => {
    if (!order || !wrappedNativeToken) return undefined;
    if (order.orderType !== OrderType.LimitIncrease) return undefined;
    if (!toToken) return undefined;
    if (!fromToken) return undefined;

    const market = marketsInfo?.[order.marketTokenAddress.toBase58()];
    if (!market) return undefined;

    const positionOrder = order as PositionOrderInfo;
    const indexTokenAmount =
      convertUsdToTokenAmount(
        sizeDeltaUsd,
        positionOrder.indexToken.decimals,
        triggerPrice
      ) ?? BN_ZERO;

    const fromTokenAddress = order.initialCollateralTokenAddress.toBase58();
    const toTokenAddress = toToken.address.toBase58();

    const findSwapPath = (usdIn: BN, opts: { byLiquidity?: boolean }) => {
      if (!marketsInfo || !marketsGraph || !swapEstimator) {
        return undefined;
      }

      const allPaths = findAllPaths(
        marketsInfo,
        marketsGraph,
        fromTokenAddress,
        toTokenAddress
      );

      if (!allPaths?.length) {
        return undefined;
      }

      let swapPath: string[] | undefined = undefined;

      if (opts.byLiquidity) {
        swapPath = allPaths[0].path;
      } else {
        swapPath = getSwapBestPath(allPaths, usdIn, swapEstimator);
      }

      if (!swapPath) {
        return undefined;
      }

      return getSwapPathStats({
        marketsInfo,
        swapPath,
        initialCollateralAddress: fromTokenAddress,
        wrappedNativeTokenAddress: WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58(),
        shouldUnwrapNativeToken: isNativeToken(toTokenAddress),
        shouldApplyPriceImpact: true,
        usdIn,
      });
    };

    return getIncreasePositionAmounts({
      marketInfo: market,
      indexToken: positionOrder.indexToken,
      initialCollateralToken: fromToken,
      collateralToken: order.targetCollateralToken,
      isLong: order.isLong,
      initialCollateralAmount: order.initialCollateralDeltaAmount,
      indexTokenAmount,
      leverage: existingPosition?.leverage,
      triggerPrice: isLimitOrderType(order.orderType)
        ? triggerPrice
        : undefined,
      position: existingPosition,
      findSwapPath,
      strategy: 'independent',
      feeDiscountFactor: userOrderFeeDiscountFactor,
      wrappedNativeToken,
    });
  }
);
