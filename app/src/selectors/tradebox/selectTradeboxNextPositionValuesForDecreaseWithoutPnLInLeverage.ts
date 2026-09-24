import { BN_ZERO, ONE_USD, USD_DECIMALS } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { NextPositionValues, TradeMode } from '@/selectors/trade/types';
import { parseValue } from '@/utils/legacy/parse';
import { getByKey } from '@/utils/lib/object';
import { getNextPositionValuesForDecreaseTrade } from '@/utils/position/getNextPositionValuesForDecreaseTrade';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { getDecreasePositionAmounts } from '@/utils/tradebox/getDecreasePositionAmounts';
import { getSwapBestPath } from '@/utils/tradebox/getSwapBestPath';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import { getTradeFlags } from '@/utils/tradebox/getTradeFlags';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectPositionConstants } from '../position/baseSelectors';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectUserOrderFeeDiscountFactor } from '../referral/selectUserOrderFeeDiscountFactor';
import { selectTokensData } from '../token/selectTokensData';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import { selectSwapEstimator } from '../trade/selectSwapEstimator';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import {
  selectTradeboxCloseSizeInputValue,
  selectTradeboxKeepLeverage,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
  selectTradeboxTriggerPriceInputValue,
} from './baseSelectors';
import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';
import { selectTradeboxReceiveTokenAddress } from './selectTradeboxReceiveTokenAddress';
import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';

export const selectTradeboxNextPositionValuesForDecreaseWithoutPnLInLeverage =
  createAppStoreSelector(
    [
      selectTradeboxTradeMode,
      selectTradeboxTradeType,
      selectTradeboxCollateralTokenAddress,
      selectTradeboxReceiveTokenAddress,
      selectTradeboxMarketTokenAddress,
      selectTradeboxCloseSizeInputValue,
      selectTradeboxKeepLeverage,
      selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
      selectTradeboxSelectedPosition,
      selectTradeboxTriggerPriceInputValue,
      selectMarketsInfo,
      selectTokensData,
      selectPositionsInfo,
      selectPositionConstants,
      selectUserOrderFeeDiscountFactor,
      selectWrappedNativeToken,
      selectSwapGraph,
      selectSwapEstimator,
    ],
    (
      tradeMode,
      tradeType,
      collateralTokenAddress,
      receiveTokenAddressRaw,
      marketAddress,
      closeSizeInputValue,
      keepLeverage,
      selectedTriggerAcceptablePriceImpactBps,
      position,
      triggerPriceInputValue,
      marketsInfo,
      tokensData,
      positionsInfo,
      { minCollateralUsd },
      { userOrderFeeDiscountFactor },
      wrappedNativeToken,
      marketsGraph,
      swapEstimator
    ): NextPositionValues | undefined => {
      const positionKey = position?.address.toBase58();
      const closeSizeUsd = parseValue(closeSizeInputValue || '0', USD_DECIMALS);
      const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
      const tradeFlags = getTradeFlags(tradeType, tradeMode);

      const receiveTokenAddress = isNativeToken(receiveTokenAddressRaw)
        ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
        : receiveTokenAddressRaw;

      const marketInfo = marketAddress
        ? getByKey(marketsInfo, marketAddress)
        : undefined;
      const collateralToken = collateralTokenAddress
        ? getByKey(tokensData, collateralTokenAddress)
        : undefined;
      const receiveToken = receiveTokenAddress
        ? getByKey(tokensData, receiveTokenAddress)
        : undefined;
      const existingPosition = positionKey
        ? getByKey(positionsInfo, positionKey)
        : undefined;

      if (
        !tradeFlags.isPosition ||
        minCollateralUsd === undefined ||
        !marketInfo ||
        !collateralToken ||
        !receiveToken ||
        !wrappedNativeToken
      ) {
        return undefined;
      }

      if (closeSizeUsd === undefined) {
        throw new Error(
          'selectTradeboxNextPositionValuesForDecrease: closeSizeUsd is undefined'
        );
      }

      const findSwapPath = (
        usdIn: BN,
        opts: { byLiquidity?: boolean } = {}
      ) => {
        if (
          !collateralTokenAddress ||
          !receiveTokenAddress ||
          !marketsGraph ||
          !swapEstimator
        ) {
          return undefined;
        }

        const allPaths = findAllPaths(
          marketsInfo,
          marketsGraph,
          collateralTokenAddress,
          receiveTokenAddress
        );

        if (!allPaths?.length) {
          return undefined;
        }

        const swapPath = opts.byLiquidity
          ? allPaths[0].path
          : getSwapBestPath(allPaths, usdIn, swapEstimator);

        if (!swapPath) {
          return undefined;
        }

        return getSwapPathStats({
          marketsInfo,
          swapPath,
          initialCollateralAddress: collateralTokenAddress,
          wrappedNativeTokenAddress: WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58(),
          shouldUnwrapNativeToken: isNativeToken(receiveTokenAddress),
          shouldApplyPriceImpact: true,
          usdIn,
        });
      };

      const decreaseAmounts = getDecreasePositionAmounts({
        marketInfo,
        collateralToken,
        receiveToken,
        isLong: tradeFlags.isLong,
        position: existingPosition,
        closeSizeUsd,
        keepLeverage,
        triggerPrice,
        fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
        minCollateralUsd: ONE_USD,
        minPositionSizeUsd: ONE_USD,
        isLimit: tradeMode === TradeMode.Trigger,
        feeDiscountFactor: userOrderFeeDiscountFactor,
        wrappedNativeToken,
        findSwapPath,
      });

      if (
        decreaseAmounts?.acceptablePrice !== undefined &&
        closeSizeUsd.gt(BN_ZERO)
      ) {
        return getNextPositionValuesForDecreaseTrade({
          existingPosition: position,
          marketInfo,
          collateralToken,
          sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
          estimatedPnl: decreaseAmounts.estimatedPnl,
          realizedPnl: decreaseAmounts.realizedPnl,
          collateralDeltaUsd: decreaseAmounts.collateralDeltaUsd,
          collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
          payedRemainingCollateralUsd:
            decreaseAmounts.payedRemainingCollateralUsd,
          payedRemainingCollateralAmount:
            decreaseAmounts.payedRemainingCollateralAmount,
          showPnlInLeverage: false,
          isLong: tradeFlags.isLong,
          minCollateralUsd,
        });
      }

      return undefined;
    }
  );
