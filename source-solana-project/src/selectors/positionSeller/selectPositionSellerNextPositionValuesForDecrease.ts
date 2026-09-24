import { BN_ZERO, ONE_USD, USD_DECIMALS } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { OrderOption } from '@/selectors/order/types';
import { TradeMode, TradeType } from '@/selectors/trade/types';
import { parseValue } from '@/utils/legacy/parse';
import { getByKey } from '@/utils/lib/object';
import { getNextPositionValuesForDecreaseTrade } from '@/utils/position/getNextPositionValuesForDecreaseTrade';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { getDecreasePositionAmounts } from '@/utils/tradebox/getDecreasePositionAmounts';
import { getSwapBestPath } from '@/utils/tradebox/getSwapBestPath';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectPositionConstants } from '../position/baseSelectors';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectUserOrderFeeDiscountFactor } from '../referral/selectUserOrderFeeDiscountFactor';
import { selectIsPnlInLeverage } from '../setting/baseSelectors';
import { selectTokensData } from '../token/selectTokensData';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import { selectSwapEstimator } from '../trade/selectSwapEstimator';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import {
  selectPositionSellerAddress,
  selectPositionSellerCloseUsdInputValue,
  selectPositionSellerOrderOption,
  selectPositionSellerReceiveTokenAddress,
  selectPositionSellerSelectedTriggerAcceptablePriceImpactBps,
  selectPositionSellerTriggerPriceInputValue,
} from './baseSelectors';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerKeepLeverage } from './selectPositionSellerKeepLeverage';
import { selectPositionSellerLeverageDisabledByCollateral } from './selectPositionSellerLeverageDisabledByCollateral';

export const selectPositionSellerNextPositionValuesForDecrease =
  createAppStoreSelector(
    [
      selectPositionSellerClosingPosition,
      selectPositionSellerSelectedTriggerAcceptablePriceImpactBps,
      selectPositionSellerAddress,
      selectPositionSellerOrderOption,
      selectPositionSellerTriggerPriceInputValue,
      selectPositionSellerCloseUsdInputValue,
      selectPositionSellerReceiveTokenAddress,
      selectIsPnlInLeverage,
      selectPositionSellerKeepLeverage,
      selectPositionSellerLeverageDisabledByCollateral,
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
      position,
      selectedTriggerAcceptablePriceImpactBps,
      positionSellerAddress,
      orderOption,
      triggerPriceInputValue,
      closeSizeInputValue,
      receiveTokenAddressRaw,
      isPnlInLeverage,
      keepLeverageRaw,
      keepLeverageDisabledByCollateral,
      marketsInfo,
      tokensData,
      positionsInfo,
      { minCollateralUsd },
      { userOrderFeeDiscountFactor },
      wrappedNativeToken,
      marketsGraph,
      swapEstimator
    ) => {
      if (!position) return undefined;

      const receiveTokenAddress = isNativeToken(receiveTokenAddressRaw)
        ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
        : receiveTokenAddressRaw;

      const keepLeverage = keepLeverageDisabledByCollateral
        ? false
        : keepLeverageRaw;
      const positionKey = positionSellerAddress?.toBase58();
      const tradeType = position.isLong ? TradeType.Long : TradeType.Short;
      const collateralTokenAddress = position.collateralTokenAddress.toBase58();
      const marketAddress = position.marketInfo.marketTokenAddress.toBase58();
      const closeSizeUsd = parseValue(closeSizeInputValue || '0', USD_DECIMALS);
      const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
      const tradeMode =
        orderOption === OrderOption.Market
          ? TradeMode.Market
          : TradeMode.Trigger;

      const marketInfo = getByKey(marketsInfo, marketAddress);
      const collateralToken = getByKey(tokensData, collateralTokenAddress);
      const existingPosition = positionKey
        ? getByKey(positionsInfo, positionKey)
        : undefined;

      if (
        !marketInfo ||
        !collateralToken ||
        !closeSizeUsd ||
        minCollateralUsd === undefined ||
        !wrappedNativeToken ||
        !marketsGraph ||
        !swapEstimator
      ) {
        return undefined;
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
          shouldUnwrapNativeToken: isNativeToken(receiveTokenAddressRaw),
          shouldApplyPriceImpact: true,
          usdIn,
        });
      };

      const decreaseAmounts = getDecreasePositionAmounts({
        marketInfo,
        collateralToken,
        isLong: tradeType === TradeType.Long,
        position: existingPosition,
        closeSizeUsd,
        keepLeverage,
        triggerPrice,
        fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
        minCollateralUsd: ONE_USD,
        minPositionSizeUsd: ONE_USD,
        isLimit: tradeMode === TradeMode.Trigger,
        receiveToken: getByKey(tokensData, receiveTokenAddress),
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
          showPnlInLeverage: isPnlInLeverage,
          isLong: tradeType === TradeType.Long,
          minCollateralUsd,
        });
      }

      return undefined;
    }
  );
