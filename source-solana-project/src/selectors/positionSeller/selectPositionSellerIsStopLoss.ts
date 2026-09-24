import { USD_DECIMALS } from '@/config/constants';
import { parseValue } from '@/utils/legacy/parse';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectPositionSellerTriggerPriceInputValue } from './baseSelectors';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerMarkPrice } from './selectPositionSellerMarkPrice';

export const selectPositionSellerIsStopLoss = createAppStoreSelector(
  [
    selectPositionSellerClosingPosition,
    selectPositionSellerMarkPrice,
    selectPositionSellerTriggerPriceInputValue,
  ],
  (position, markPrice, triggerPriceInputValue): boolean => {
    if (!position || !markPrice) {
      return false;
    }

    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

    if (!triggerPrice) {
      return false;
    }

    if (position.isLong) {
      return triggerPrice.lt(markPrice);
    } else {
      return triggerPrice.gt(markPrice);
    }
  }
);
