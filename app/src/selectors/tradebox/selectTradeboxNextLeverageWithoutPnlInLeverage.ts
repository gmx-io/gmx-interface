import { createAppStoreSelector } from '@/zustand/useAppStore';

import { BN } from '@coral-xyz/anchor';
import { selectTradeboxNextPositionValuesForDecreaseWithoutPnLInLeverage } from './selectTradeboxNextPositionValuesForDecreaseWithoutPnLInLeverage';
import { selectTradeboxNextPositionValuesForIncreaseWithoutPnLInLeverage } from './selectTradeboxNextPositionValuesForIncreaseWithoutPnLInLeverage';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxNextLeverageWithoutPnlInLeverage =
  createAppStoreSelector(
    selectTradeboxTradeFlags,
    selectTradeboxNextPositionValuesForIncreaseWithoutPnLInLeverage,
    selectTradeboxNextPositionValuesForDecreaseWithoutPnLInLeverage,
    (
      tradeFlags,
      nextPositionValuesForIncrease,
      nextPositionValuesForDecrease
    ): BN | undefined => {
      const nextValues = tradeFlags.isIncrease
        ? nextPositionValuesForIncrease
        : nextPositionValuesForDecrease;

      return nextValues?.nextLeverage;
    }
  );
