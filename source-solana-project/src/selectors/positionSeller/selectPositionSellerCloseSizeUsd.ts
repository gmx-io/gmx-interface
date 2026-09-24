import { USD_DECIMALS } from '@/config/constants';
import { parseValue } from '@/utils/legacy/parse';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPositionSellerCloseUsdInputValue } from './baseSelectors';

export const selectPositionSellerCloseSizeUsd = createAppStoreSelector(
  [selectPositionSellerCloseUsdInputValue],
  (closeUsdInputValue) => {
    return parseValue(closeUsdInputValue || '0', USD_DECIMALS)!;
  }
);
