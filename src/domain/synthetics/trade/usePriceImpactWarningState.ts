import { HIGH_COLLATERAL_IMPACT_BPS, HIGH_SWAP_IMPACT_BPS } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import { mustNeverExist } from "lib/types";
import { usePrevious } from "lib/usePrevious";
import { useEffect, useMemo, useState } from "react";
import shallowEqual from "shallowequal";
import { FeeItem } from "../fees";
import { TradeFlags } from "sdk/types/trade";

export type PriceImpactWarningState = ReturnType<typeof usePriceImpactWarningState>;

export function usePriceImpactWarningState({
  positionPriceImpact,
  swapPriceImpact,
  place,
  tradeFlags,
}: {
  positionPriceImpact?: FeeItem;
  swapPriceImpact?: FeeItem;
  place: "tradeBox" | "positionSeller";
  tradeFlags: TradeFlags;
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
    positionPriceImpact &&
      positionPriceImpact.deltaUsd < 0 &&
      bigMath.abs(positionPriceImpact.bps) >= HIGH_COLLATERAL_IMPACT_BPS
  );

  const isHighSwapImpact = Boolean(
    swapPriceImpact && swapPriceImpact.deltaUsd < 0 && bigMath.abs(swapPriceImpact.bps) >= HIGH_SWAP_IMPACT_BPS
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
      shouldShowWarningForSwap = isHighSwapImpact;

      if (!tradeFlags.isSwap) {
        validationError = validationError || (isHighPositionImpact && !isHighPositionImpactAccepted);
        shouldShowWarningForPosition = isHighPositionImpact;
      }

      shouldShowWarning = isHighSwapImpact || isHighPositionImpact;
    } else if (place === "positionSeller") {
      validationError =
        (isHighPositionImpact && !isHighPositionImpactAccepted) || (isHighSwapImpact && !isHighSwapImpactAccepted);
      shouldShowWarning = isHighPositionImpact || isHighSwapImpact;
      shouldShowWarningForPosition = isHighPositionImpact;
      shouldShowWarningForSwap = isHighSwapImpact;
    } else {
      throw mustNeverExist(place);
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
