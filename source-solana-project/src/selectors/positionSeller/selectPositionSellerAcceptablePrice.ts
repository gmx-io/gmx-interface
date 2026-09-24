import { createAppStoreSelector } from '@/zustand/useAppStore';
import {
  selectPositionSellerOrderOption,
  selectPositionSellerSelectedTriggerAcceptablePriceImpactBps,
  selectPositionSellerTriggerPriceInputValue,
} from './baseSelectors';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import { OrderOption } from '@/selectors/order/types';
import { selectSavedAllowedSlippage } from '@/selectors/setting/baseSelectors';
import { parseValue } from '@/utils/legacy/parse';
import { USD_DECIMALS } from '@/config/constants';

export const selectPositionSellerAcceptablePrice = createAppStoreSelector(
  [
    selectPositionSellerClosingPosition,
    selectPositionSellerTriggerPriceInputValue,
    selectPositionSellerSelectedTriggerAcceptablePriceImpactBps,
    selectPositionSellerOrderOption,
    selectSavedAllowedSlippage,
  ],
  (
    position,
    triggerPriceInputValue,
    selectedTriggerAcceptablePriceImpactBps,
    orderOption,
    allowedSlippage
  ) => {
    if (!position) return undefined;

    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
    if (!triggerPrice) return undefined;

    const shouldApplySlippage = orderOption === OrderOption.Market;
    const shouldApplyPriceImpact = orderOption === OrderOption.Trigger;

    const slippageToApply = shouldApplySlippage
      ? allowedSlippage
      : shouldApplyPriceImpact
        ? (selectedTriggerAcceptablePriceImpactBps ?? 0)
        : 0;

    return applySlippageToPrice(
      slippageToApply,
      triggerPrice,
      false, // isIncrease is false for position seller
      position.isLong
    );
  }
);
