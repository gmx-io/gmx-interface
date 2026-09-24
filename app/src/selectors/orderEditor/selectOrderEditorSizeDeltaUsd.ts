import { parseValue } from '@/utils/legacy/parse';
import { selectOrderEditorSizeInputValue } from './baseSelectors';
import { USD_DECIMALS } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectOrderEditorSizeDeltaUsd = createAppStoreSelector(
  [selectOrderEditorSizeInputValue],
  (sizeInputValue) => {
    return parseValue(sizeInputValue, USD_DECIMALS);
  }
);
