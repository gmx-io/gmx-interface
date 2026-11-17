import { useEffect } from "react";
import { usePrevious } from "react-use";

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

export function useTradeboxAcceptablePriceImpactValues({
  isUsdgConversionActive,
  isUsdgOrderAutoSubmitArmed,
}: {
  isUsdgConversionActive: boolean;
  isUsdgOrderAutoSubmitArmed: boolean;
}) {
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

  const { fromTokenAddress: isPayTokenChanged, ...orderChanges } = useTradeboxChanges();
  const previousTradeFlags = usePrevious(tradeFlags);
  const isRemountDuringConversion = isUsdgConversionActive && previousTradeFlags === undefined;
  const isPayTokenSwitchedByConversion = isPayTokenChanged && isUsdgOrderAutoSubmitArmed;

  const isAnyValueChanged =
    !isRemountDuringConversion &&
    ((isPayTokenChanged && !isPayTokenSwitchedByConversion) || Object.values(orderChanges).some(Boolean));

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

      if (isAnyValueChanged || !isAcceptablePriceImpactCustomized) {
        setSelectedAcceptablePriceImpactBps(recommendedAcceptablePriceImpactBps);
      }

      setDefaultTriggerAcceptablePriceImpactBps(recommendedAcceptablePriceImpactBps);
    },
    [
      isAcceptablePriceImpactCustomized,
      isAnyValueChanged,
      recommendedAcceptablePriceImpactBps,
      setDefaultTriggerAcceptablePriceImpactBps,
      setSelectedAcceptablePriceImpactBps,
    ]
  );
}
