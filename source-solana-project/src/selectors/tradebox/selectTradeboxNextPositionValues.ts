import { createAppStoreSelector } from '@/zustand/useAppStore';

import { NextPositionValues } from '@/selectors/trade/types';
import { selectTradeboxNextPositionValuesForDecrease } from './selectTradeboxNextPositionValuesForDecrease';
import { selectTradeboxNextPositionValuesForIncrease } from './selectTradeboxNextPositionValuesForIncrease';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxNextPositionValues = createAppStoreSelector(
  selectTradeboxTradeFlags,
  selectTradeboxNextPositionValuesForIncrease,
  selectTradeboxNextPositionValuesForDecrease,
  (
    tradeFlags,
    nextPositionValuesForIncrease,
    nextPositionValuesForDecrease
  ): NextPositionValues | undefined => {
    return tradeFlags.isIncrease
      ? nextPositionValuesForIncrease
      : nextPositionValuesForDecrease;
  }
);
