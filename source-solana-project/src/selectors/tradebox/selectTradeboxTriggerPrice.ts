import { USD_DECIMALS } from '@/config/constants';
import { parseValue } from '@/utils/legacy/parse';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTriggerPriceInputValue } from './baseSelectors';

export const selectTradeboxTriggerPrice = createAppStoreSelector(
  selectTradeboxTriggerPriceInputValue,
  (triggerPriceInputValue) => parseValue(triggerPriceInputValue, USD_DECIMALS)
);
