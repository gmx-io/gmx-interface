import { HIGH_POSITION_IMPACT_BPS } from "config/factors";
import { useEffect, useMemo, useState } from "react";
import { FeeItem } from "../fees";
import { TradeFlags } from "./useTradeFlags";

export type PriceImpactWarningState = ReturnType<typeof usePriceImpactWarningState>;

export function usePriceImpactWarningState({
  positionPriceImpact,
  swapPriceImpact,
  tradeFlags,
}: {
  positionPriceImpact?: FeeItem;
  swapPriceImpact?: FeeItem;
  tradeFlags: TradeFlags;
}) {
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
    const shouldAcceptPriceImpactWarningInTradeBox =
      isHighSwapImpact && !isHighSwapImpactAccepted && !tradeFlags.isSwap;
    const shouldAcceptPriceImpactWarningInModal =
      !tradeFlags.isLimit &&
      !tradeFlags.isTrigger &&
      ((isHighPositionImpact && !isHighPositionImpactAccepted && !tradeFlags.isSwap) ||
        (isHighSwapImpact && !isHighSwapImpactAccepted && tradeFlags.isSwap));

    const shouldShowWarning = isHighPositionImpact || isHighSwapImpact;

    return {
      isHighPositionImpact,
      isHighSwapImpact,
      isHighPositionImpactAccepted,
      isHighSwapImpactAccepted,
      shouldAcceptPriceImpactWarningInTradeBox,
      shouldAcceptPriceImpactWarningInModal,
      setIsHighSwapImpactAccepted,
      setIsHighPositionImpactAccepted,
      shouldShowWarning,
    };
  }, [
    isHighPositionImpact,
    isHighPositionImpactAccepted,
    isHighSwapImpact,
    isHighSwapImpactAccepted,
    tradeFlags.isLimit,
    tradeFlags.isSwap,
    tradeFlags.isTrigger,
  ]);
}
