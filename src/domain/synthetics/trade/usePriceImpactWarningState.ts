import shallowEqual from "shallowequal";

import { getExcessiveExecutionFee } from "config/chains";
import {
  HIGH_COLLATERAL_IMPACT_BPS,
  HIGH_POSITION_IMPACT_BPS,
  HIGH_SWAP_IMPACT_BPS,
  HIGH_SWAP_PROFIT_FEE_BPS,
  USD_DECIMALS,
} from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";
import { usePrevious } from "lib/usePrevious";
import { useEffect, useMemo, useState } from "react";
import type { FeeItem } from "sdk/types/fees";
import type { TradeFlags } from "sdk/types/trade";

export type PriceImpactWarningState = ReturnType<typeof usePriceImpactWarningState>;

export function usePriceImpactWarningState({
  collateralImpact,
  positionImpact,
  swapPriceImpact,
  swapProfitFee,
  executionFeeUsd,
  tradeFlags,
}: {
  collateralImpact?: FeeItem;
  positionImpact?: FeeItem;
  swapPriceImpact?: FeeItem;
  swapProfitFee?: FeeItem;
  executionFeeUsd?: bigint;
  tradeFlags: TradeFlags;
}) {
  const { chainId } = useChainId();
  const veryHighExecutionFeeUsd = useMemo(
    () => expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS),
    [chainId]
  );
  const isHightExecutionPrice = executionFeeUsd === undefined ? false : executionFeeUsd >= veryHighExecutionFeeUsd;
  const prevIsHightExecutionPrice = usePrevious(isHightExecutionPrice);

  const [isAccepted, setIsAccepted] = useState(false);
  const prevFlags = usePrevious(tradeFlags);

  useEffect(() => {
    if (!shallowEqual(prevFlags, tradeFlags)) {
      setIsAccepted(false);
      return;
    }
  }, [prevFlags, tradeFlags]);

  const isHighPositionImpact = Boolean(
    positionImpact && positionImpact.deltaUsd < 0 && bigMath.abs(positionImpact.bps) >= HIGH_POSITION_IMPACT_BPS
  );
  const prevIsHighPositionImpact = usePrevious(isHighPositionImpact);

  const isHighCollateralImpact = Boolean(
    collateralImpact && collateralImpact.deltaUsd < 0 && bigMath.abs(collateralImpact.bps) >= HIGH_COLLATERAL_IMPACT_BPS
  );
  const prevIsHighCollateralImpact = usePrevious(isHighCollateralImpact);

  const isHighSwapImpact = Boolean(
    swapPriceImpact && swapPriceImpact.deltaUsd < 0 && bigMath.abs(swapPriceImpact.bps) >= HIGH_SWAP_IMPACT_BPS
  );
  const prevIsHighSwapImpact = usePrevious(isHighSwapImpact);

  const isHightSwapProfitFee = Boolean(
    swapProfitFee && swapProfitFee.deltaUsd < 0 && bigMath.abs(swapProfitFee.bps) >= HIGH_SWAP_PROFIT_FEE_BPS
  );
  const prevIsHightSwapProfitFee = usePrevious(isHightSwapProfitFee);

  useEffect(
    function resetWarning() {
      if (
        !isAccepted ||
        prevIsHighCollateralImpact === undefined ||
        prevIsHighPositionImpact === undefined ||
        prevIsHighSwapImpact === undefined ||
        prevIsHightSwapProfitFee === undefined ||
        prevIsHightExecutionPrice === undefined
      ) {
        return;
      }

      if (
        prevIsHighPositionImpact !== isHighPositionImpact ||
        prevIsHighCollateralImpact !== isHighCollateralImpact ||
        prevIsHighSwapImpact !== isHighSwapImpact ||
        prevIsHightSwapProfitFee !== isHightSwapProfitFee ||
        prevIsHightExecutionPrice !== isHightExecutionPrice
      ) {
        setIsAccepted(false);
      }
    },
    [
      isAccepted,
      isHighCollateralImpact,
      isHighPositionImpact,
      isHighSwapImpact,
      isHightExecutionPrice,
      isHightSwapProfitFee,
      prevIsHighCollateralImpact,
      prevIsHighPositionImpact,
      prevIsHighSwapImpact,
      prevIsHightExecutionPrice,
      prevIsHightSwapProfitFee,
    ]
  );

  let validationError = false;
  let shouldShowWarning = false;
  let shouldShowWarningForSwap = false;
  let shouldShowWarningForPosition = false;
  let shouldShowWarningForCollateral = false;
  let shouldShowWarningForSwapProfitFee = false;
  let shouldShowWarningForExecutionFee = false;

  shouldShowWarningForSwap = isHighSwapImpact;
  shouldShowWarningForPosition = isHighPositionImpact;
  shouldShowWarningForSwapProfitFee = isHightSwapProfitFee;
  shouldShowWarningForExecutionFee = isHightExecutionPrice;

  if (!shouldShowWarningForPosition) {
    shouldShowWarningForCollateral = isHighCollateralImpact;
  }

  shouldShowWarning =
    shouldShowWarningForPosition ||
    shouldShowWarningForCollateral ||
    shouldShowWarningForSwap ||
    shouldShowWarningForSwapProfitFee ||
    shouldShowWarningForExecutionFee;

  validationError = !isAccepted && shouldShowWarning;

  const stableWarningState = useMemo(() => {
    return {
      shouldShowWarningForPosition,
      shouldShowWarningForCollateral,
      shouldShowWarningForSwap,
      shouldShowWarningForSwapProfitFee,
      shouldShowWarningForExecutionFee,
      validationError,
      isAccepted,
      setIsAccepted,
      shouldShowWarning,
    };
  }, [
    shouldShowWarningForPosition,
    shouldShowWarningForCollateral,
    shouldShowWarningForSwap,
    shouldShowWarningForSwapProfitFee,
    shouldShowWarningForExecutionFee,
    validationError,
    isAccepted,
    setIsAccepted,
    shouldShowWarning,
  ]);

  return stableWarningState;
}
