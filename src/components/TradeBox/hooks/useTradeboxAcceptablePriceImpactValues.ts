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

export function useTradeboxAcceptablePriceImpactValues() {
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

  let recommendedAcceptablePriceImpactBps: bigint | undefined;

  if (isLimit && increaseAmounts?.acceptablePrice) {
    recommendedAcceptablePriceImpactBps = bigMath.abs(increaseAmounts.recommendedAcceptablePriceDeltaBps);
  } else if (isTrigger && decreaseAmounts?.acceptablePrice !== undefined) {
    recommendedAcceptablePriceImpactBps = bigMath.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps);
  }

  useEffect(
    function resetAcceptablePriceImpactOnTradeboxChanges() {
      if (isAnyValueChanged) {
        setDefaultTriggerAcceptablePriceImpactBps(undefined);
        setSelectedAcceptablePriceImpactBps(undefined);
      }
    },
    [isAnyValueChanged, setDefaultTriggerAcceptablePriceImpactBps, setSelectedAcceptablePriceImpactBps]
  );

  useEffect(
    function followRecommendedAcceptablePriceImpact() {
      if (recommendedAcceptablePriceImpactBps === undefined) {
        return;
      }

      const isCustomized =
        selectedTriggerAcceptablePriceImpactBps !== undefined &&
        defaultTriggerAcceptablePriceImpactBps !== undefined &&
        selectedTriggerAcceptablePriceImpactBps !== defaultTriggerAcceptablePriceImpactBps;

      if (!isCustomized) {
        setSelectedAcceptablePriceImpactBps(recommendedAcceptablePriceImpactBps);
      }

      setDefaultTriggerAcceptablePriceImpactBps(recommendedAcceptablePriceImpactBps);
    },
    [
      defaultTriggerAcceptablePriceImpactBps,
      recommendedAcceptablePriceImpactBps,
      selectedTriggerAcceptablePriceImpactBps,
      setDefaultTriggerAcceptablePriceImpactBps,
      setSelectedAcceptablePriceImpactBps,
    ]
  );
}
