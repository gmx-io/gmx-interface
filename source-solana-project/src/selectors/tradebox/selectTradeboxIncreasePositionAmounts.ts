import { USD_DECIMALS } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { parseAmount, parseValue } from '@/utils/legacy/parse';
import { getByKey } from '@/utils/lib/object';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { getIncreasePositionAmounts } from '@/utils/tradebox/getIncreasePositionAmounts';
import { IncreasePositionAmounts } from '@/utils/tradebox/types';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectUserOrderFeeDiscountFactor } from '../referral/selectUserOrderFeeDiscountFactor';
import { selectSavedAcceptablePriceImpactBuffer } from '../setting/baseSelectors';
import { selectTokensData } from '../token/selectTokensData';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import {
  selectTradeboxFocusedInput,
  selectTradeboxFromTokenInputValue,
  selectTradeboxIsLeverageEnabled,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxToTokenInputValue,
  selectTradeboxTradeLeverage,
  selectTradeboxTriggerPriceInputValue,
} from './baseSelectors';
import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';
import { selectTradeboxFindSwapPath } from './selectTradeboxFindSwapPath';
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';
import { selectTradeboxMarketInfo } from './selectTradeboxMarketInfo';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxIncreasePositionAmounts = createAppStoreSelector(
  [
    selectTokensData,
    selectTradeboxTradeFlags,
    selectTradeboxFromTokenAddress,
    selectTradeboxFromTokenInputValue,
    selectTradeboxToTokenAddress,
    selectTradeboxToTokenInputValue,
    selectTradeboxMarketInfo,
    selectTradeboxTradeLeverage,
    selectTradeboxIsLeverageEnabled,
    selectTradeboxFocusedInput,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
    selectTradeboxTriggerPriceInputValue,
    selectSavedAcceptablePriceImpactBuffer,
    selectUserOrderFeeDiscountFactor,
    selectWrappedNativeToken,
    selectTradeboxFindSwapPath,
  ],
  (
    tokensData,
    tradeFlags,
    fromTokenAddress,
    fromTokenInputValue,
    toTokenAddress,
    toTokenInputValue,
    marketInfo,
    leverage,
    isLeverageEnabled,
    focusedInput,
    collateralTokenAddress,
    selectedTriggerAcceptablePriceImpactBps,
    triggerPriceInputValue,
    savedAcceptablePriceImpactBuffer,
    { userOrderFeeDiscountFactor },
    wrappedNativeToken,
    findSwapPath
  ): IncreasePositionAmounts | undefined => {
    const fromToken = fromTokenAddress
      ? getByKey(tokensData, fromTokenAddress)
      : undefined;
    const fromTokenAmount = fromToken
      ? parseAmount(fromTokenInputValue, fromToken)
      : undefined;
    const toToken = toTokenAddress
      ? getByKey(tokensData, toTokenAddress)
      : undefined;
    const toTokenAmount = toToken
      ? parseAmount(toTokenInputValue, toToken)
      : undefined;
    const triggerPrice = parseValue(
      triggerPriceInputValue || '0',
      USD_DECIMALS
    );

    if (
      !marketInfo ||
      !fromToken ||
      !toToken ||
      !fromTokenAmount ||
      !wrappedNativeToken
    ) {
      return undefined;
    }

    if (isNativeToken(fromTokenAddress)) {
      fromTokenAddress = WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58();
    }

    const strategy = isLeverageEnabled
      ? focusedInput === 'from'
        ? 'leverageByCollateral'
        : 'leverageBySize'
      : 'independent';

    return getIncreasePositionAmounts({
      marketInfo,
      indexToken: toToken,
      initialCollateralToken: fromToken,
      collateralToken:
        getByKey(tokensData, collateralTokenAddress) ?? fromToken,
      isLong: tradeFlags.isLong,
      initialCollateralAmount: fromTokenAmount,
      indexTokenAmount: toTokenAmount,
      leverage,
      triggerPrice: tradeFlags.isLimit ? triggerPrice : undefined,
      position: undefined,
      fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
      acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
      findSwapPath,
      strategy,
      feeDiscountFactor: userOrderFeeDiscountFactor,
      wrappedNativeToken,
    });
  }
);
