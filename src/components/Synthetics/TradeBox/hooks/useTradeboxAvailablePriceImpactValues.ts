import { useEffect } from "react";

import {
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { bigMath } from "sdk/utils/bigmath";
import { useTradeboxChanges } from "./useTradeboxChanges";

export function useTradeboxAvailablePriceImpactValues() {
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const defaultTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);
  const selectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);

  const tradeFlags = useSelector(selectTradeboxTradeFlags);

  const { isLimit, isTrigger } = tradeFlags;

  const setDefaultTriggerAcceptablePriceImpactBps = useSelector(
    selectTradeboxSetDefaultTriggerAcceptablePriceImpactBps
  );
  const setSelectedAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);

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
  }, [isAnyValueChanged, setDefaultTriggerAcceptablePriceImpactBps, setSelectedAcceptablePriceImpactBps]);

  /**
   * Set initial value for limit / stop market orders
   */
  useEffect(() => {
    if (
      isLimit &&
      increaseAmounts?.acceptablePrice &&
      defaultTriggerAcceptablePriceImpactBps === undefined &&
      selectedTriggerAcceptablePriceImpactBps === undefined
    ) {
      setSelectedAcceptablePriceImpactBps(bigMath.abs(increaseAmounts.acceptablePriceDeltaBps));
      setDefaultTriggerAcceptablePriceImpactBps(bigMath.abs(increaseAmounts.acceptablePriceDeltaBps));
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
      setSelectedAcceptablePriceImpactBps(bigMath.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps));
      setDefaultTriggerAcceptablePriceImpactBps(bigMath.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps));
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
