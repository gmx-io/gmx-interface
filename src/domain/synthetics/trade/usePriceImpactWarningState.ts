import shallowEqual from "shallowequal";

import { getExcessiveExecutionFee } from "config/chains";
import { HIGH_SWAP_PROFIT_FEE_BPS, USD_DECIMALS } from "config/factors";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";
import { usePrevious } from "lib/usePrevious";
import { useEffect, useMemo, useState } from "react";
import type { TradeFlags } from "sdk/types/trade";
import { bigMath } from "sdk/utils/bigmath";
import type { FeeItem } from "../fees";
import { getIsHighSwapImpact } from "./utils/getIsHighSwapImpact";
import { getIsHighCollateralImpact } from "./utils/getIsHighCollateralImpact";
import { getIsHighPositionImpact } from "./utils/getIsHighPositionImpact";

export type WarningState = {
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForCollateral: boolean;
  shouldShowWarningForSwap: boolean;
  shouldShowWarningForSwapProfitFee: boolean;
  shouldShowWarningForExecutionFee: boolean;
  shouldShowWarningForTriggerOrders: boolean;
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
  willDecreaseOrdersBeExecuted,
  tradeFlags,
}: {
  collateralImpact?: FeeItem;
  positionImpact?: FeeItem;
  swapPriceImpact?: FeeItem;
  swapProfitFee?: FeeItem;
  executionFeeUsd?: bigint;
  willDecreaseOrdersBeExecuted?: boolean;
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

  const isHighPositionImpact = getIsHighPositionImpact(positionImpact);
  const prevIsHighPositionImpact = usePrevious(isHighPositionImpact);

  const isHighCollateralImpact = getIsHighCollateralImpact(collateralImpact);
  const prevIsHighCollateralImpact = usePrevious(isHighCollateralImpact);

  const isHighSwapImpact = getIsHighSwapImpact(swapPriceImpact);
  const prevIsHighSwapImpact = usePrevious(isHighSwapImpact);

  const isHightSwapProfitFee = Boolean(
    swapProfitFee && swapProfitFee.deltaUsd < 0n && bigMath.abs(swapProfitFee.bps) >= BigInt(HIGH_SWAP_PROFIT_FEE_BPS)
  );
  const prevIsHightSwapProfitFee = usePrevious(isHightSwapProfitFee);

  const prevWillDecreaseOrdersBeExecuted = usePrevious(willDecreaseOrdersBeExecuted);

  useEffect(
    function resetWarning() {
      if (
        !isDismissed ||
        prevIsHighCollateralImpact === undefined ||
        prevIsHighPositionImpact === undefined ||
        prevIsHighSwapImpact === undefined ||
        prevIsHightSwapProfitFee === undefined ||
        prevIsHightExecutionPrice === undefined ||
        prevWillDecreaseOrdersBeExecuted === undefined
      ) {
        return;
      }

      if (
        prevIsHighPositionImpact !== isHighPositionImpact ||
        prevIsHighCollateralImpact !== isHighCollateralImpact ||
        prevIsHighSwapImpact !== isHighSwapImpact ||
        prevIsHightSwapProfitFee !== isHightSwapProfitFee ||
        prevIsHightExecutionPrice !== isHightExecutionPrice ||
        prevWillDecreaseOrdersBeExecuted !== willDecreaseOrdersBeExecuted
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
      prevWillDecreaseOrdersBeExecuted,
      willDecreaseOrdersBeExecuted,
    ]
  );

  let validationError = false;
  let shouldShowWarning = false;
  let shouldShowWarningForSwap = false;
  let shouldShowWarningForPosition = false;
  let shouldShowWarningForCollateral = false;
  let shouldShowWarningForSwapProfitFee = false;
  let shouldShowWarningForExecutionFee = false;
  let shouldShowWarningForTriggerOrders = false;

  shouldShowWarningForSwap = isHighSwapImpact;
  shouldShowWarningForPosition = isHighPositionImpact;
  shouldShowWarningForSwapProfitFee = isHightSwapProfitFee;
  shouldShowWarningForExecutionFee = isHightExecutionPrice;
  shouldShowWarningForTriggerOrders = willDecreaseOrdersBeExecuted ?? false;

  if (!shouldShowWarningForPosition) {
    shouldShowWarningForCollateral = isHighCollateralImpact;
  }

  shouldShowWarning =
    shouldShowWarningForPosition ||
    shouldShowWarningForCollateral ||
    shouldShowWarningForSwap ||
    shouldShowWarningForSwapProfitFee ||
    shouldShowWarningForExecutionFee ||
    shouldShowWarningForTriggerOrders;

  const stableWarningState = useMemo<WarningState>(() => {
    return {
      shouldShowWarningForPosition,
      shouldShowWarningForCollateral,
      shouldShowWarningForSwap,
      shouldShowWarningForSwapProfitFee,
      shouldShowWarningForExecutionFee,
      shouldShowWarningForTriggerOrders,
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
    shouldShowWarningForTriggerOrders,
    validationError,
    isDismissed,
    shouldShowWarning,
  ]);

  return stableWarningState;
}
