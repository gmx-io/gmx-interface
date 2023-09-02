import { HIGH_POSITION_IMPACT_BPS } from "config/factors";
import { useEffect, useMemo, useState } from "react";
import { FeeItem } from "../fees";

export type PriceImpactWarningState = ReturnType<typeof usePriceImpactWarningState>;

export function usePriceImpactWarningState(p: { positionPriceImpact?: FeeItem; swapPriceImpact?: FeeItem }) {
  const { positionPriceImpact, swapPriceImpact } = p;

  const [isHighPositionImpactAccepted, setIsHighPositionImpactAccepted] = useState(false);
  const [isHighSwapImpactAccepted, setIsHighSwapImpactAccepted] = useState(false);

  const isHighPositionImpact =
    positionPriceImpact?.deltaUsd.lt(0) && positionPriceImpact?.bps.abs().gte(HIGH_POSITION_IMPACT_BPS);

  const isHighSwapImpact = swapPriceImpact?.deltaUsd.lt(0) && swapPriceImpact?.bps.abs().gte(HIGH_POSITION_IMPACT_BPS);

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
    const shouldAcceptPriceImpactWarning =
      (isHighPositionImpact && !isHighPositionImpactAccepted) || (isHighSwapImpact && !isHighSwapImpactAccepted);

    const shouldShowWarning = isHighPositionImpact || isHighSwapImpact;

    return {
      isHighPositionImpact,
      isHighSwapImpact,
      isHighPositionImpactAccepted,
      isHighSwapImpactAccepted,
      shouldAcceptPriceImpactWarning,
      setIsHighSwapImpactAccepted,
      setIsHighPositionImpactAccepted,
      shouldShowWarning,
    };
  }, [isHighPositionImpact, isHighPositionImpactAccepted, isHighSwapImpact, isHighSwapImpactAccepted]);
}
