import { useEffect } from "react";

import {
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsAcceptablePriceImpactCustomized,
  selectTradeboxSetDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxSetIsAcceptablePriceImpactCustomized,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { bigMath } from "sdk/utils/bigmath";

import { useTradeboxChanges } from "./useTradeboxChanges";

export function useTradeboxAcceptablePriceImpactValues() {
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const isAcceptablePriceImpactCustomized = useSelector(selectTradeboxIsAcceptablePriceImpactCustomized);

  const tradeFlags = useSelector(selectTradeboxTradeFlags);

  const { isLimit, isTrigger } = tradeFlags;

  const setDefaultTriggerAcceptablePriceImpactBps = useSelector(
    selectTradeboxSetDefaultTriggerAcceptablePriceImpactBps
  );
  const setSelectedAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
  const setIsAcceptablePriceImpactCustomized = useSelector(selectTradeboxSetIsAcceptablePriceImpactCustomized);

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
        setIsAcceptablePriceImpactCustomized(false);
      }
    },
    [
      isAnyValueChanged,
      setDefaultTriggerAcceptablePriceImpactBps,
      setIsAcceptablePriceImpactCustomized,
      setSelectedAcceptablePriceImpactBps,
    ]
  );

  useEffect(
    function followRecommendedAcceptablePriceImpact() {
      if (recommendedAcceptablePriceImpactBps === undefined) {
        return;
      }

      if (!isAcceptablePriceImpactCustomized) {
        setSelectedAcceptablePriceImpactBps(recommendedAcceptablePriceImpactBps);
      }

      setDefaultTriggerAcceptablePriceImpactBps(recommendedAcceptablePriceImpactBps);
    },
    [
      isAcceptablePriceImpactCustomized,
      recommendedAcceptablePriceImpactBps,
      setDefaultTriggerAcceptablePriceImpactBps,
      setSelectedAcceptablePriceImpactBps,
    ]
  );
}
