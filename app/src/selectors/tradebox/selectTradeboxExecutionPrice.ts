import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxMarketInfo } from './selectTradeboxMarketInfo';
import { selectTradeboxTradeFees } from './selectTradeboxTradeFees';
import { selectTradeboxDecreasePositionAmounts } from './selectTradeboxDecreasePositionAmounts';
import { selectTradeboxIncreasePositionAmounts } from './selectTradeboxIncreasePositionAmounts';
import { selectTradeboxTriggerPriceInputValue } from './baseSelectors';
import { selectTradeboxMarkPrice } from './selectTradeboxMarkPrice';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { BN } from '@coral-xyz/anchor';
import { parseValue } from '@/utils/legacy/parse';
import { USD_DECIMALS } from '@/config/constants';
import { getNextPositionExecutionPrice } from '@/utils/position/getNextPositionExecutionPrice';

export const selectTradeboxExecutionPrice = createAppStoreSelector(
  selectTradeboxMarketInfo,
  selectTradeboxTradeFees,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxTriggerPriceInputValue,
  selectTradeboxMarkPrice,
  selectTradeboxTradeFlags,
  (
    marketInfo,
    fees,
    decreaseAmounts,
    increaseAmounts,
    triggerPriceInputValue,
    markPrice,
    tradeFlags
  ): BN | null => {
    const { isLong, isIncrease, isMarket } = tradeFlags;

    if (!marketInfo) return null;
    if (fees?.positionPriceImpact?.deltaUsd === undefined) return null;

    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
    const nextTriggerPrice = isMarket ? markPrice : triggerPrice;
    const sizeDeltaUsd = isIncrease
      ? increaseAmounts?.sizeDeltaUsd
      : decreaseAmounts?.sizeDeltaUsd;

    if (nextTriggerPrice === undefined) return null;
    if (sizeDeltaUsd === undefined) return null;

    return getNextPositionExecutionPrice({
      triggerPrice: nextTriggerPrice,
      priceImpactUsd: fees.positionPriceImpact.deltaUsd,
      sizeDeltaUsd,
      isLong,
      isIncrease,
    });
  }
);
