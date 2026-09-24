import { parseValue } from '@/utils/legacy/parse';
import { selectOrderEditorTriggerPriceInputValue } from './baseSelectors';
import { USD_DECIMALS } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectOrderEditorTriggerPrice = createAppStoreSelector(
  [selectOrderEditorTriggerPriceInputValue],
  (triggerPriceInputValue) => {
    return parseValue(triggerPriceInputValue, USD_DECIMALS);
  }
);
