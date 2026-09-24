import { createAppStoreSelector } from '@/zustand/useAppStore';
import { USD_DECIMALS } from '@/config/constants';
import { parseValue } from '@/utils/legacy/parse';
import { selectTradeboxCloseSizeInputValue } from './baseSelectors';

export const selectTradeboxCloseSize = createAppStoreSelector(
  selectTradeboxCloseSizeInputValue,
  (closeSizeInputValue) => parseValue(closeSizeInputValue, USD_DECIMALS)
);
