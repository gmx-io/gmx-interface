import { BN_ZERO, ONE_USD } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { PositionOrderInfo } from '@/selectors/order/types';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import { isLimitOrderType } from '@/utils/order/isOrderType';
import { getNextPositionValuesForIncreaseTrade } from '@/utils/position/getNextPositionValuesForIncreaseTrade';
import { getTokenData } from '@/utils/token/getTokenData';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { getIncreasePositionAmounts } from '@/utils/tradebox/getIncreasePositionAmounts';
import { getSwapBestPath } from '@/utils/tradebox/getSwapBestPath';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectUserOrderFeeDiscountFactor } from '../referral/selectUserOrderFeeDiscountFactor';
import { selectIsPnlInLeverage } from '../setting/baseSelectors';
import { selectTokensData } from '../token/selectTokensData';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import { selectSwapEstimator } from '../trade/selectSwapEstimator';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import {
  selectOrderEditorAcceptablePriceImpactBps,
  selectOrderEditorInitialAcceptablePriceImpactBps,
} from './baseSelectors';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { selectOrderEditorExistingPosition } from './selectOrderEditorExistingPosition';
import { selectOrderEditorSizeDeltaUsd } from './selectOrderEditorSizeDeltaUsd';
import { selectOrderEditorTriggerPrice } from './selectOrderEditorTriggerPrice';

export const selectOrderEditorNextPositionValuesForIncrease =
  createAppStoreSelector(
    [
      selectOrderEditorEditingOrder,
      selectOrderEditorSizeDeltaUsd,
      selectOrderEditorTriggerPrice,
      selectTokensData,
      selectOrderEditorExistingPosition,
      selectIsPnlInLeverage,
      selectOrderEditorInitialAcceptablePriceImpactBps,
      selectOrderEditorAcceptablePriceImpactBps,
      selectMarketsInfo,
      selectSwapGraph,
      selectSwapEstimator,
      selectUserOrderFeeDiscountFactor,
      selectWrappedNativeToken,
    ],
    (
      order,
      sizeDeltaUsd,
      triggerPrice,
      tokensData,
      existingPosition,
      isPnlInLeverage,
      initialAcceptablePriceImpactBps,
      acceptablePriceImpactBps,
      marketsInfo,
      marketsGraph,
      swapEstimator,
      { userOrderFeeDiscountFactor },
      wrappedNativeToken
    ) => {
      if (!order) return undefined;

      const positionOrder = order as PositionOrderInfo;
      const positionIndexToken = positionOrder?.indexToken;
      const indexTokenAmount = positionIndexToken
        ? convertUsdToTokenAmount(
            sizeDeltaUsd,
            positionIndexToken.decimals,
            triggerPrice
          ) ?? BN_ZERO
        : undefined;
      const fromToken = getTokenData(
        tokensData,
        order.initialCollateralTokenAddress
      );

      if (!fromToken || !wrappedNativeToken) return undefined;

      const collateralTokenAddress =
        positionOrder?.targetCollateralToken.address.toBase58();
      const indexTokenAddress = positionIndexToken?.address.toBase58();
      const initialCollateralTokenAddress = fromToken?.address.toBase58();
      const marketAddress = positionOrder?.marketTokenAddress.toBase58();

      if (
        !marketAddress ||
        !collateralTokenAddress ||
        !indexTokenAddress ||
        !initialCollateralTokenAddress
      ) {
        return undefined;
      }

      const market = marketsInfo?.[marketAddress];
      if (!market) return undefined;

      const fromTokenAddress = initialCollateralTokenAddress;
      const toTokenAddress = existingPosition
        ? collateralTokenAddress
        : indexTokenAddress;

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

      const increaseAmounts = getIncreasePositionAmounts({
        marketInfo: market,
        indexToken: positionIndexToken,
        initialCollateralToken: fromToken,
        collateralToken: positionOrder.targetCollateralToken,
        isLong: positionOrder.isLong,
        initialCollateralAmount:
          positionOrder.initialCollateralDeltaAmount ?? BN_ZERO,
        indexTokenAmount,
        leverage: existingPosition?.leverage,
        triggerPrice: isLimitOrderType(order.orderType)
          ? triggerPrice
          : undefined,
        position: existingPosition,
        findSwapPath,
        strategy: 'independent',
        fixedAcceptablePriceImpactBps: initialAcceptablePriceImpactBps,
        acceptablePriceImpactBuffer: acceptablePriceImpactBps,
        feeDiscountFactor: userOrderFeeDiscountFactor,
        wrappedNativeToken,
      });

      if (
        increaseAmounts &&
        positionOrder.initialCollateralDeltaAmount.gt(BN_ZERO)
      ) {
        return getNextPositionValuesForIncreaseTrade({
          marketInfo: market,
          collateralToken: positionOrder.targetCollateralToken,
          existingPosition,
          isLong: positionOrder.isLong,
          collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
          collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
          indexPrice: increaseAmounts.indexPrice,
          showPnlInLeverage: isPnlInLeverage,
          minCollateralUsd: ONE_USD,
        });
      }

      return undefined;
    }
  );
