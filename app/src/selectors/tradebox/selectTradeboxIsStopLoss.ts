import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectTradeboxMarkPrice } from './selectTradeboxMarkPrice';
import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';
import { selectTradeboxTriggerPrice } from './selectTradeboxTriggerPrice';

export const selectTradeboxIsStopLoss = createAppStoreSelector(
  selectTradeboxTriggerPrice,
  selectTradeboxMarkPrice,
  selectTradeboxSelectedPosition,
  (triggerPrice, markPrice, existingPosition): boolean => {
    if (!triggerPrice || !markPrice || !existingPosition) {
      return false;
    }

    if (existingPosition.isLong) {
      return triggerPrice.lt(markPrice);
    } else {
      return triggerPrice.gt(markPrice);
    }
  }
);
