import { USD_DECIMALS } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import {
  selectTradeboxTradeMode,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxTriggerPriceInputValue,
} from './baseSelectors';
import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import { TradeMode } from '@/selectors/trade/types';
import { selectSavedAllowedSlippage } from '@/selectors/setting/baseSelectors';
import { parseValue } from '@/utils/legacy/parse';

export const selectTradeboxAcceptablePrice = createAppStoreSelector(
  [
    selectTradeboxSelectedPosition,
    selectTradeboxTriggerPriceInputValue,
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
    selectTradeboxTradeMode,
    selectSavedAllowedSlippage,
  ],
  (
    position,
    triggerPriceInputValue,
    selectedTriggerAcceptablePriceImpactBps,
    tradeMode,
    allowedSlippage
  ) => {
    if (!position) return undefined;

    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
    if (!triggerPrice) return undefined;

    const shouldApplySlippage = tradeMode === TradeMode.Market;
    const shouldApplyPriceImpact = tradeMode === TradeMode.Trigger;

    const slippageToApply = shouldApplySlippage
      ? allowedSlippage
      : shouldApplyPriceImpact
        ? (selectedTriggerAcceptablePriceImpactBps ?? 0)
        : 0;

    return applySlippageToPrice(
      slippageToApply,
      triggerPrice,
      false, // isIncrease is false for decrease position
      position.isLong
    );
  }
);
