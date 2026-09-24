import { TradeFeesType } from '@/selectors/fee/types';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { selectTradeboxSwapAmounts } from './selectTradeboxSwapAmounts';
import { selectTradeboxIncreasePositionAmounts } from './selectTradeboxIncreasePositionAmounts';
import { selectTradeboxDecreasePositionAmounts } from './selectTradeboxDecreasePositionAmounts';

export const selectTradeboxTradeFeesType = createAppStoreSelector(
  [
    selectTradeboxTradeFlags,
    selectTradeboxSwapAmounts,
    selectTradeboxIncreasePositionAmounts,
    selectTradeboxDecreasePositionAmounts,
  ],
  (
    tradeFlags,
    swapAmounts,
    increaseAmounts,
    decreaseAmounts
  ): TradeFeesType | null => {
    const { isSwap, isIncrease, isTrigger } = tradeFlags;

    if (isSwap && swapAmounts?.swapPathStats) {
      return 'swap';
    }

    if (isIncrease && increaseAmounts) {
      return 'increase';
    }

    if (isTrigger && decreaseAmounts) {
      return 'decrease';
    }

    return null;
  }
);
