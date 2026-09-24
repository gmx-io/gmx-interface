import { selectTradeboxTradeLeverage } from './baseSelectors';

import {
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxTriggerPriceInputValue,
} from './baseSelectors';

import { selectTradeboxFocusedInput } from './baseSelectors';

import { selectTradeboxIsLeverageEnabled } from './baseSelectors';

import { selectTradeboxToTokenInputValue } from './baseSelectors';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';
import { selectTradeboxFromTokenInputValue } from './baseSelectors';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';
import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';
import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';
import {
  selectIsPnlInLeverage,
  selectSavedAcceptablePriceImpactBuffer,
} from '../setting/baseSelectors';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import { selectSwapEstimator } from '../trade/selectSwapEstimator';
import { selectPositionConstants } from '../position/baseSelectors';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import { selectUserOrderFeeDiscountFactor } from '../referral/selectUserOrderFeeDiscountFactor';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { NextPositionValues } from '@/selectors/trade/types';
import { getByKey } from '@/utils/lib/object';
import { parseValue } from '@/utils/legacy/parse';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { BN } from '@coral-xyz/anchor';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import { getSwapBestPath } from '@/utils/tradebox/getSwapBestPath';
import { getIncreasePositionAmounts } from '@/utils/tradebox/getIncreasePositionAmounts';
import { getNextPositionValuesForIncreaseTrade } from '@/utils/position/getNextPositionValuesForIncreaseTrade';
import { isNativeToken } from '@/utils/token/isNativeToken';

export const selectTradeboxNextPositionValuesForIncrease =
  createAppStoreSelector(
    [
      selectTokensData,
      selectTradeboxTradeFlags,
      selectTradeboxFromTokenAddress,
      selectTradeboxFromTokenInputValue,
      selectTradeboxToTokenAddress,
      selectTradeboxToTokenInputValue,
      selectTradeboxMarketTokenAddress,
      selectTradeboxIsLeverageEnabled,
      selectTradeboxFocusedInput,
      selectTradeboxCollateralTokenAddress,
      selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
      selectTradeboxTriggerPriceInputValue,
      selectTradeboxSelectedPosition,
      selectIsPnlInLeverage,
      selectTradeboxTradeLeverage,
      selectMarketsInfo,
      selectSwapGraph,
      selectSwapEstimator,
      selectPositionConstants,
      selectSavedAcceptablePriceImpactBuffer,
      selectUserOrderFeeDiscountFactor,
      selectWrappedNativeToken,
    ],
    (
      tokensData,
      tradeFlags,
      fromTokenAddressRaw,
      fromTokenInputValue,
      toTokenAddress,
      toTokenInputValue,
      marketAddress,
      isLeverageEnabled,
      focusedInput,
      collateralTokenAddress,
      selectedTriggerAcceptablePriceImpactBps,
      triggerPriceInputValue,
      position,
      isPnlInLeverage,
      leverage,
      marketsInfo,
      marketsGraph,
      swapEstimator,
      { minCollateralUsd },
      savedAcceptablePriceImpactBuffer,
      { userOrderFeeDiscountFactor },
      wrappedNativeToken
    ): NextPositionValues | undefined => {
      const fromToken = isNativeToken(fromTokenAddressRaw)
        ? wrappedNativeToken
        : getByKey(tokensData, fromTokenAddressRaw);
      const fromTokenAddress = isNativeToken(fromTokenAddressRaw)
        ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
        : fromTokenAddressRaw;
      const fromTokenAmount = fromToken
        ? parseValue(fromTokenInputValue || '0', fromToken.decimals)!
        : BN_ZERO;
      const toToken = toTokenAddress
        ? getByKey(tokensData, toTokenAddress)
        : undefined;
      const toTokenAmount = toToken
        ? parseValue(toTokenInputValue || '0', toToken.decimals)
        : BN_ZERO;
      const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
      const marketInfo = marketAddress
        ? getByKey(marketsInfo, marketAddress)
        : undefined;
      const collateralToken = collateralTokenAddress
        ? getByKey(tokensData, collateralTokenAddress)
        : undefined;

      if (
        !marketInfo ||
        !collateralToken ||
        minCollateralUsd === undefined ||
        !fromToken ||
        !toToken ||
        !marketsGraph ||
        !swapEstimator
      ) {
        return undefined;
      }

      const findSwapPath = (
        usdIn: BN,
        opts: { byLiquidity?: boolean } = {}
      ) => {
        if (!fromTokenAddress || !collateralTokenAddress) {
          return undefined;
        }

        const allPaths = findAllPaths(
          marketsInfo,
          marketsGraph,
          fromTokenAddress,
          collateralTokenAddress
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
          initialCollateralAddress: fromTokenAddress,
          wrappedNativeTokenAddress: WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58(),
          shouldUnwrapNativeToken: isNativeToken(toTokenAddress),
          shouldApplyPriceImpact: true,
          usdIn,
        });
      };

      if (!wrappedNativeToken) {
        return undefined;
      }

      const increaseAmounts = getIncreasePositionAmounts({
        marketInfo,
        indexToken: toToken,
        initialCollateralToken: fromToken,
        collateralToken,
        isLong: tradeFlags.isLong,
        initialCollateralAmount: fromTokenAmount,
        indexTokenAmount: toTokenAmount,
        leverage,
        triggerPrice: tradeFlags.isLimit ? triggerPrice : undefined,
        position: undefined,
        fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
        acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
        findSwapPath,
        strategy: isLeverageEnabled
          ? focusedInput === 'from'
            ? 'leverageByCollateral'
            : 'leverageBySize'
          : 'independent',
        feeDiscountFactor: userOrderFeeDiscountFactor,
        wrappedNativeToken,
      });

      if (increaseAmounts && fromTokenAmount.gt(BN_ZERO)) {
        return getNextPositionValuesForIncreaseTrade({
          existingPosition: position,
          marketInfo,
          collateralToken,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
          collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
          collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
          indexPrice: increaseAmounts.indexPrice,
          isLong: tradeFlags.isLong,
          showPnlInLeverage: isPnlInLeverage,
          minCollateralUsd,
        });
      }

      return undefined;
    }
  );
