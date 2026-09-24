import { USD_DECIMALS } from '@/config/constants';
import { parseValue } from '@/utils/legacy/parse';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPositionSellerTriggerPriceInputValue } from './baseSelectors';

export const selectPositionSellerTriggerPrice = createAppStoreSelector(
  [selectPositionSellerTriggerPriceInputValue],
  (triggerPriceInputValue) => {
    return parseValue(triggerPriceInputValue, USD_DECIMALS);
  }
);
