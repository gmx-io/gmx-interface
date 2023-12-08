import { HIGH_POSITION_IMPACT_BPS, HIGH_SWAP_IMPACT_BPS } from "config/factors";
import { useEffect, useMemo, useState } from "react";
import { FeeItem } from "../fees";
import { TradeFlags } from "./useTradeFlags";
import { museNeverExist } from "lib/types";

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

  const isHighPositionImpact =
    positionPriceImpact?.deltaUsd.lt(0) && positionPriceImpact?.bps.abs().gte(HIGH_POSITION_IMPACT_BPS);

  const isHighSwapImpact = swapPriceImpact?.deltaUsd.lt(0) && swapPriceImpact?.bps.abs().gte(HIGH_SWAP_IMPACT_BPS);

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

    if (place === "tradeBox" || place === "confirmationBox") {
      validationError = Boolean(
        !tradeFlags.isLimit && isHighSwapImpact && !isHighSwapImpactAccepted && !tradeFlags.isSwap
      );
    } else if (place === "positionSeller") {
      validationError =
        Boolean(!tradeFlags.isTrigger && isHighPositionImpact && !isHighPositionImpactAccepted) ||
        Boolean(tradeFlags.isPosition && isHighSwapImpact && !isHighSwapImpactAccepted);
    } else {
      throw museNeverExist(place);
    }

    const shouldShowWarning = isHighPositionImpact || isHighSwapImpact;

    return {
      isHighPositionImpact,
      isHighSwapImpact,
      isHighPositionImpactAccepted,
      isHighSwapImpactAccepted,
      validationError,
      setIsHighSwapImpactAccepted,
      setIsHighPositionImpactAccepted,
      shouldShowWarning,
    };
  }, [
    isHighPositionImpact,
    isHighPositionImpactAccepted,
    isHighSwapImpact,
    isHighSwapImpactAccepted,
    place,
    tradeFlags.isLimit,
    tradeFlags.isPosition,
    tradeFlags.isSwap,
    tradeFlags.isTrigger,
  ]);
}
