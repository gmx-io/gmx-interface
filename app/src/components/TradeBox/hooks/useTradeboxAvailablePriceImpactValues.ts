import { useTradeboxChanges } from '@/hooks/tradeboxHooks/useTradeBoxChanges';
import { selectSetTradeboxSelectedTriggerAcceptablePriceImpactBps } from '@/selectors/tradebox/baseSelectors';
import { selectSetTradeboxDefaultTriggerAcceptablePriceImpactBps } from '@/selectors/tradebox/baseSelectors';
import {
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxDecreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxDecreasePositionAmounts';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect } from 'react';

export function useTradeboxAvailablePriceImpactValues() {
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useAppStore(selectTradeboxDecreasePositionAmounts);
  const defaultTriggerAcceptablePriceImpactBps = useAppStore(
    selectTradeboxDefaultTriggerAcceptablePriceImpactBps
  );
  const selectedTriggerAcceptablePriceImpactBps = useAppStore(
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps
  );

  const tradeFlags = useAppStore(selectTradeboxTradeFlags);

  const { isLimit, isTrigger } = tradeFlags;

  const setDefaultTriggerAcceptablePriceImpactBps = useAppStore(
    selectSetTradeboxDefaultTriggerAcceptablePriceImpactBps
  );
  const setSelectedAcceptablePriceImpactBps = useAppStore(
    selectSetTradeboxSelectedTriggerAcceptablePriceImpactBps
  );

  const tradeboxChanges = useTradeboxChanges();

  const isAnyValueChanged = Object.values(tradeboxChanges).some(Boolean);

  /**
   * Drop selected acceptable price impact when user changes market/pool/trade type/limit price
   */
  useEffect(() => {
    if (isAnyValueChanged) {
      setDefaultTriggerAcceptablePriceImpactBps(undefined);
      setSelectedAcceptablePriceImpactBps(undefined);
    }
  }, [
    isAnyValueChanged,
    setDefaultTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImpactBps,
  ]);

  /**
   * Set initial value for limit orders
   */
  useEffect(() => {
    if (
      isLimit &&
      increaseAmounts?.acceptablePrice &&
      defaultTriggerAcceptablePriceImpactBps === undefined &&
      selectedTriggerAcceptablePriceImpactBps === undefined
    ) {
      setSelectedAcceptablePriceImpactBps(
        Math.abs(increaseAmounts.acceptablePriceDeltaBps)
      );
      setDefaultTriggerAcceptablePriceImpactBps(
        Math.abs(increaseAmounts.acceptablePriceDeltaBps)
      );
    }
  }, [
    defaultTriggerAcceptablePriceImpactBps,
    increaseAmounts?.acceptablePrice,
    increaseAmounts?.acceptablePriceDeltaBps,
    isLimit,
    selectedTriggerAcceptablePriceImpactBps,
    setDefaultTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImpactBps,
  ]);

  /**
   * Set initial values from TP/SL orders
   */
  useEffect(() => {
    if (
      isTrigger &&
      decreaseAmounts?.acceptablePrice !== undefined &&
      defaultTriggerAcceptablePriceImpactBps === undefined &&
      selectedTriggerAcceptablePriceImpactBps === undefined
    ) {
      setSelectedAcceptablePriceImpactBps(
        Math.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps)
      );
      setDefaultTriggerAcceptablePriceImpactBps(
        Math.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps)
      );
    }
  }, [
    decreaseAmounts?.acceptablePrice,
    decreaseAmounts?.recommendedAcceptablePriceDeltaBps,
    defaultTriggerAcceptablePriceImpactBps,
    isTrigger,
    selectedTriggerAcceptablePriceImpactBps,
    setDefaultTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImpactBps,
  ]);
}
