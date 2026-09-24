import { USD_DECIMALS } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { TradeMode, TradeType } from '@/selectors/trade/types';
import { parseValue } from '@/utils/legacy/parse';
import { getByKey } from '@/utils/lib/object';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { getDecreasePositionAmounts } from '@/utils/tradebox/getDecreasePositionAmounts';
import { DecreasePositionAmounts } from '@/utils/tradebox/types';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectPositionConstants } from '../position/baseSelectors';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectUserOrderFeeDiscountFactor } from '../referral/selectUserOrderFeeDiscountFactor';
import { selectSavedAcceptablePriceImpactBuffer } from '../setting/baseSelectors';
import { selectTokensData } from '../token/selectTokensData';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import {
  selectTradeboxCloseSizeInputValue,
  selectTradeboxKeepLeverage,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
  selectTradeboxTriggerPriceInputValue,
} from './baseSelectors';
import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';
import { selectTradeboxFindSwapPathForReceiveToken } from './selectTradeboxFindSwapPathForReceiveToken';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';
import { selectTradeboxReceiveTokenAddress } from './selectTradeboxReceiveTokenAddress';
import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';

export const selectTradeboxDecreasePositionAmounts = createAppStoreSelector(
  [
    selectTradeboxTradeMode,
    selectTradeboxTradeType,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxReceiveTokenAddress,
    selectTradeboxMarketTokenAddress,
    selectTradeboxTriggerPriceInputValue,
    selectTradeboxCloseSizeInputValue,
    selectTradeboxKeepLeverage,
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
    selectTradeboxSelectedPosition,
    selectMarketsInfo,
    selectTokensData,
    selectPositionsInfo,
    selectPositionConstants,
    selectSavedAcceptablePriceImpactBuffer,
    selectUserOrderFeeDiscountFactor,
    selectWrappedNativeToken,
    selectTradeboxFindSwapPathForReceiveToken,
  ],
  (
    tradeMode,
    tradeType,
    collateralTokenAddress,
    receiveTokenAddressRaw,
    marketAddress,
    triggerPriceInputValue,
    closeSizeInputValue,
    keepLeverage,
    selectedTriggerAcceptablePriceImpactBps,
    selectedPosition,
    marketsInfo,
    tokensData,
    positionsInfo,
    { minCollateralUsd, minPositionSizeUsd },
    acceptablePriceImpactBuffer,
    { userOrderFeeDiscountFactor },
    wrappedNativeToken,
    findSwapPathForReceiveToken
  ): DecreasePositionAmounts | undefined => {
    if (keepLeverage === undefined) {
      keepLeverage = false;
    }

    const receiveTokenAddress = isNativeToken(receiveTokenAddressRaw)
      ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
      : receiveTokenAddressRaw;

    const positionKey = selectedPosition?.address?.toBase58();
    const closeSizeUsd = parseValue(closeSizeInputValue || '0', USD_DECIMALS);
    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

    const marketInfo = marketAddress
      ? getByKey(marketsInfo, marketAddress)
      : undefined;
    const position = positionKey
      ? getByKey(positionsInfo, positionKey)
      : undefined;
    const collateralToken = collateralTokenAddress
      ? getByKey(tokensData, collateralTokenAddress)
      : undefined;
    const receiveToken = receiveTokenAddress
      ? getByKey(tokensData, receiveTokenAddress)
      : undefined;

    if (
      !marketInfo ||
      !position ||
      !collateralToken ||
      closeSizeUsd === undefined ||
      minCollateralUsd === undefined ||
      minPositionSizeUsd === undefined ||
      !wrappedNativeToken
    ) {
      return undefined;
    }

    // const findSwapPath = (usdIn: BN, opts: { byLiquidity?: boolean } = {}) => {
    //   if (
    //     !collateralTokenAddress ||
    //     !receiveTokenAddress ||
    //     !marketsGraph ||
    //     !swapEstimator
    //   ) {
    //     return undefined;
    //   }

    //   const allPaths = findAllPaths(
    //     marketsInfo,
    //     marketsGraph,
    //     collateralTokenAddress,
    //     receiveTokenAddress
    //   );

    //   if (!allPaths?.length) {
    //     return undefined;
    //   }

    //   const swapPath = opts.byLiquidity
    //     ? allPaths[0].path
    //     : getSwapBestPath(allPaths, usdIn, swapEstimator);

    //   if (!swapPath) {
    //     return undefined;
    //   }

    //   return getSwapPathStats({
    //     marketsInfo,
    //     swapPath,
    //     initialCollateralAddress: collateralTokenAddress,
    //     wrappedNativeTokenAddress: WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58(),
    //     shouldUnwrapNativeToken: isNativeToken(receiveTokenAddressRaw),
    //     shouldApplyPriceImpact: true,
    //     usdIn,
    //   });
    // };

    return getDecreasePositionAmounts({
      marketInfo,
      collateralToken,
      receiveToken,
      isLong: tradeType === TradeType.Long,
      position,
      closeSizeUsd,
      keepLeverage,
      triggerPrice,
      fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
      acceptablePriceImpactBuffer,
      minCollateralUsd,
      minPositionSizeUsd,
      isLimit: tradeMode === TradeMode.Trigger,
      feeDiscountFactor: userOrderFeeDiscountFactor,
      wrappedNativeToken,
      findSwapPath: findSwapPathForReceiveToken,
    });
  }
);
