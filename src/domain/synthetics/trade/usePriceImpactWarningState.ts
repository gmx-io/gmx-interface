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
import type { FeeItem } from "../fees";
import type { TradeFlags } from "sdk/types/trade";

export type PriceImpactWarningState = ReturnType<typeof usePriceImpactWarningState>;

export type WarningState = {
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForCollateral: boolean;
  shouldShowWarningForSwap: boolean;
  shouldShowWarningForSwapProfitFee: boolean;
  shouldShowWarningForExecutionFee: boolean;
  isDismissed: boolean;
  setIsDismissed: (isDismissed: boolean) => void;
  shouldShowWarning: boolean;
};

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
}): WarningState {
  const { chainId } = useChainId();
  const veryHighExecutionFeeUsd = useMemo(
    () => expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS),
    [chainId]
  );
  const isHightExecutionPrice = executionFeeUsd === undefined ? false : executionFeeUsd >= veryHighExecutionFeeUsd;
  const prevIsHightExecutionPrice = usePrevious(isHightExecutionPrice);

  const [isDismissed, setIsDismissed] = useState(false);
  const prevFlags = usePrevious(tradeFlags);

  useEffect(() => {
    if (!shallowEqual(prevFlags, tradeFlags)) {
      setIsDismissed(false);
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
        !isDismissed ||
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
        setIsDismissed(false);
      }
    },
    [
      isDismissed,
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

  const stableWarningState = useMemo<WarningState>(() => {
    return {
      shouldShowWarningForPosition,
      shouldShowWarningForCollateral,
      shouldShowWarningForSwap,
      shouldShowWarningForSwapProfitFee,
      shouldShowWarningForExecutionFee,
      validationError,
      isDismissed,
      setIsDismissed,
      shouldShowWarning,
    };
  }, [
    shouldShowWarningForPosition,
    shouldShowWarningForCollateral,
    shouldShowWarningForSwap,
    shouldShowWarningForSwapProfitFee,
    shouldShowWarningForExecutionFee,
    validationError,
    isDismissed,
    shouldShowWarning,
  ]);

  return stableWarningState;
}
