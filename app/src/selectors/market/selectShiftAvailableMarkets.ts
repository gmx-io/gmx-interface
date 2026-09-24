import { createAppStoreSelector } from '@/zustand/useAppStore';
import { getShiftAvailableMarkets } from '@/utils/shift/getShiftAvailableMarkets';
import { selectMarketsInfo } from './selectMarketsInfo';
import values from 'lodash/values';

export const selectShiftAvailableMarkets = createAppStoreSelector(
  [selectMarketsInfo],
  (marketsInfo) => {
    return getShiftAvailableMarkets({
      markets: values(marketsInfo),
    });
  }
);
