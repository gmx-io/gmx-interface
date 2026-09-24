import { USD_DECIMALS } from '@/config/constants';

import { BN_ZERO } from '@/config/constants';
import { parseValue } from '@/utils/legacy/parse';
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';
import { selectTradeboxMarkPrice } from './selectTradeboxMarkPrice';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTriggerRatioInputValue } from './baseSelectors';
import { selectTokensData } from '../token/selectTokensData';
import { getByKey } from '@/utils/lib/object';
import { getTokensRatioByPrices } from '@/utils/token/getTokensRatioByPrices';

export const selectTradeboxTradeRatios = createAppStoreSelector(
  [
    selectTradeboxTradeFlags,
    selectTradeboxFromTokenAddress,
    selectTradeboxToTokenAddress,
    selectTradeboxTriggerRatioInputValue,
    selectTokensData,
    selectTradeboxMarkPrice,
  ],
  (
    tradeFlags,
    fromTokenAddress,
    toTokenAddress,
    triggerRatioInputValue,
    tokensData,
    markPrice
  ) => {
    const { isSwap } = tradeFlags;

    if (!isSwap) return {};

    const fromToken = fromTokenAddress
      ? getByKey(tokensData, fromTokenAddress)
      : undefined;
    const toToken = toTokenAddress
      ? getByKey(tokensData, toTokenAddress)
      : undefined;
    const fromTokenPrice = fromToken?.prices.minPrice;

    if (
      !fromToken ||
      !toToken ||
      fromTokenPrice === undefined ||
      markPrice === undefined
    ) {
      return {};
    }

    const markRatio = getTokensRatioByPrices({
      fromToken,
      toToken,
      fromPrice: fromTokenPrice,
      toPrice: markPrice,
    });

    if (triggerRatioInputValue === undefined) {
      return { markRatio };
    }

    const triggerRatioValue = parseValue(triggerRatioInputValue, USD_DECIMALS);

    if (triggerRatioValue === undefined) {
      return { markRatio };
    }

    const triggerRatio = {
      ratio: triggerRatioValue.gt(BN_ZERO)
        ? triggerRatioValue
        : markRatio.ratio,
      largestToken: markRatio.largestToken,
      smallestToken: markRatio.smallestToken,
    };

    return {
      markRatio,
      triggerRatio,
    };
  }
);
