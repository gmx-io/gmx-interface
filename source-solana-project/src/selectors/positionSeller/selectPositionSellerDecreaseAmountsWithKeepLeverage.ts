import { USD_DECIMALS } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { OrderOption } from '@/selectors/order/types';
import { TradeMode, TradeType } from '@/selectors/trade/types';
import { parseValue } from '@/utils/legacy/parse';
import { getByKey } from '@/utils/lib/object';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { getDecreasePositionAmounts } from '@/utils/tradebox/getDecreasePositionAmounts';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectPositionConstants } from '../position/baseSelectors';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectUserOrderFeeDiscountFactor } from '../referral/selectUserOrderFeeDiscountFactor';
import { selectSavedAcceptablePriceImpactBuffer } from '../setting/baseSelectors';
import { selectTokensData } from '../token/selectTokensData';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import {
  selectPositionSellerAddress,
  selectPositionSellerCloseUsdInputValue,
  selectPositionSellerOrderOption,
  selectPositionSellerReceiveTokenAddress,
  selectPositionSellerSelectedTriggerAcceptablePriceImpactBps,
  selectPositionSellerTriggerPriceInputValue,
} from './baseSelectors';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerFindSwapPath } from './selectPositionSellerFindSwapPath';

export const selectPositionSellerDecreaseAmountsWithKeepLeverage =
  createAppStoreSelector(
    [
      selectPositionSellerClosingPosition,
      selectPositionSellerSelectedTriggerAcceptablePriceImpactBps,
      selectPositionSellerAddress,
      selectPositionSellerOrderOption,
      selectPositionSellerTriggerPriceInputValue,
      selectPositionSellerCloseUsdInputValue,
      selectPositionSellerReceiveTokenAddress,
      selectMarketsInfo,
      selectTokensData,
      selectPositionsInfo,
      selectPositionConstants,
      selectSavedAcceptablePriceImpactBuffer,
      selectUserOrderFeeDiscountFactor,
      selectWrappedNativeToken,
      selectPositionSellerFindSwapPath,
    ],
    (
      position,
      selectedTriggerAcceptablePriceImpactBps,
      positionSellerAddress,
      orderOption,
      triggerPriceInputValue,
      closeSizeInputValue,
      receiveTokenAddressRaw,
      marketsInfo,
      tokensData,
      positionsInfo,
      { minCollateralUsd, minPositionSizeUsd },
      acceptablePriceImpactBuffer,
      { userOrderFeeDiscountFactor },
      wrappedNativeToken,
      findSwapPath
    ) => {
      if (!position) return undefined;

      const receiveTokenAddress = isNativeToken(receiveTokenAddressRaw)
        ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
        : receiveTokenAddressRaw;

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
      const receiveToken = getByKey(tokensData, receiveTokenAddress);
      const existingPosition = positionKey
        ? getByKey(positionsInfo, positionKey)
        : undefined;

      if (
        !marketInfo ||
        !collateralToken ||
        !closeSizeUsd ||
        minCollateralUsd === undefined ||
        minPositionSizeUsd === undefined ||
        !wrappedNativeToken
      ) {
        return undefined;
      }

      return getDecreasePositionAmounts({
        marketInfo,
        collateralToken,
        isLong: tradeType === TradeType.Long,
        position: existingPosition,
        closeSizeUsd,
        keepLeverage: true,
        triggerPrice,
        fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
        acceptablePriceImpactBuffer,
        minCollateralUsd,
        minPositionSizeUsd,
        isLimit: tradeMode === TradeMode.Trigger,
        receiveToken,
        feeDiscountFactor: userOrderFeeDiscountFactor,
        wrappedNativeToken,
        findSwapPath,
      });
    }
  );
