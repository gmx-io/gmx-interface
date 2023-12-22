import { HIGH_POSITION_IMPACT_BPS, HIGH_SWAP_IMPACT_BPS } from "config/factors";
import { useEffect, useMemo, useState } from "react";
import shallowEqual from "shallowequal";
import { FeeItem } from "../fees";
import { TradeFlags } from "./useTradeFlags";
import { museNeverExist } from "lib/types";
import { usePrevious } from "lib/usePrevious";

export type PriceImpactWarningState = ReturnType<typeof usePriceImpactWarningState>;

export function usePriceImpactWarningState({
  positionPriceImpact,
  swapPriceImpact,
  tradeFlags,
  place,
}: {
  positionPriceImpact?: FeeItem;
  swapPriceImpact?: FeeItem;
  tradeFlags: TradeFlags;
  place: "tradeBox" | "positionSeller" | "confirmationBox";
}) {
  const [isHighPositionImpactAccepted, setIsHighPositionImpactAccepted] = useState(false);
  const [isHighSwapImpactAccepted, setIsHighSwapImpactAccepted] = useState(false);

  const prevFlags = usePrevious(tradeFlags);

  useEffect(() => {
    if (!shallowEqual(prevFlags, tradeFlags)) {
      setIsHighPositionImpactAccepted(false);
      setIsHighSwapImpactAccepted(false);
      return;
    }
  }, [prevFlags, tradeFlags]);

  const isHighPositionImpact = Boolean(
    positionPriceImpact?.deltaUsd.lt(0) && positionPriceImpact?.bps.abs().gte(HIGH_POSITION_IMPACT_BPS)
  );

  const isHighSwapImpact = Boolean(
    swapPriceImpact?.deltaUsd.lt(0) && swapPriceImpact?.bps.abs().gte(HIGH_SWAP_IMPACT_BPS)
  );

  useEffect(
    function resetPositionImactWarning() {
      if (!isHighPositionImpact && isHighPositionImpactAccepted) {
        setIsHighPositionImpactAccepted(false);
      }
    },
    [isHighPositionImpact, isHighPositionImpactAccepted]
  );

  useEffect(
    function resetSwapImpactWarning() {
      if (!isHighSwapImpact && isHighSwapImpactAccepted) {
        setIsHighSwapImpactAccepted(false);
      }
    },
    [isHighSwapImpact, isHighSwapImpactAccepted]
  );

  return useMemo(() => {
    let validationError = false;
    let shouldShowWarning = false;
    let shouldShowWarningForSwap = false;
    let shouldShowWarningForPosition = false;

    if (place === "tradeBox") {
      validationError = isHighSwapImpact && !isHighSwapImpactAccepted;
      shouldShowWarning = isHighSwapImpact;
      shouldShowWarningForSwap = isHighSwapImpact;
    } else if (place === "confirmationBox") {
      if (!tradeFlags.isSwap) {
        validationError = isHighPositionImpact && !isHighPositionImpactAccepted;
        shouldShowWarning = isHighPositionImpact;
        shouldShowWarningForPosition = isHighPositionImpact;
      }
    } else if (place === "positionSeller") {
      validationError =
        (isHighPositionImpact && !isHighPositionImpactAccepted) || (isHighSwapImpact && !isHighSwapImpactAccepted);
      shouldShowWarning = isHighPositionImpact || isHighSwapImpact;
      shouldShowWarningForPosition = isHighPositionImpact;
      shouldShowWarningForSwap = isHighSwapImpact;
    } else {
      throw museNeverExist(place);
    }

    return {
      isHighPositionImpactAccepted,
      isHighSwapImpactAccepted,
      validationError,
      setIsHighSwapImpactAccepted,
      setIsHighPositionImpactAccepted,
      shouldShowWarningForSwap,
      shouldShowWarningForPosition,
      shouldShowWarning,
    };
  }, [
    isHighPositionImpact,
    isHighPositionImpactAccepted,
    isHighSwapImpact,
    isHighSwapImpactAccepted,
    place,
    tradeFlags.isSwap,
  ]);
}
