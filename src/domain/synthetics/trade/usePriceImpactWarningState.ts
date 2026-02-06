import { useEffect, useMemo, useState } from "react";
import shallowEqual from "shallowequal";

import { getExcessiveExecutionFee } from "config/chains";
import { HIGH_SWAP_PROFIT_FEE_BPS, USD_DECIMALS } from "config/factors";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";
import { usePrevious } from "lib/usePrevious";
import { bigMath } from "sdk/utils/bigmath";
import type { FeeItem } from "sdk/utils/fees/types";
import type { TradeFlags } from "sdk/utils/trade/types";

import { getIsHighSwapImpact, getIsHighCollateralImpact, getIsHighExternalSwapFees } from "./utils/warnings";

export type WarningState = {
  shouldShowWarningForCollateral: boolean;
  shouldShowWarningForSwap: boolean;
  shouldShowWarningForSwapProfitFee: boolean;
  shouldShowWarningForExecutionFee: boolean;
  shouldShowWarningForTriggerOrders: boolean;
  shouldShowWarningForExternalSwap: boolean;
  shouldShowWarningForTwapNetworkFee: boolean;
  isDismissed: boolean;
  setIsDismissed: (isDismissed: boolean) => void;
  shouldShowWarning: boolean;
};

export function usePriceImpactWarningState({
  collateralNetPriceImpact,
  swapPriceImpact,
  swapProfitFee,
  executionFeeUsd,
  externalSwapFeeItem,
  willDecreaseOrdersBeExecuted,
  tradeFlags,
  payUsd,
}: {
  collateralNetPriceImpact?: FeeItem;
  swapPriceImpact?: FeeItem;
  swapProfitFee?: FeeItem;
  executionFeeUsd?: bigint;
  externalSwapFeeItem?: FeeItem;
  willDecreaseOrdersBeExecuted?: boolean;
  tradeFlags: TradeFlags;
  payUsd: bigint | undefined;
}): WarningState {
  const { chainId } = useChainId();
  const veryHighExecutionFeeUsd = useMemo(
    () => expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS),
    [chainId]
  );
  const isHightExecutionPrice =
    executionFeeUsd === undefined || tradeFlags.isTwap ? false : executionFeeUsd >= veryHighExecutionFeeUsd;
  const prevIsHightExecutionPrice = usePrevious(isHightExecutionPrice);

  const [isDismissed, setIsDismissed] = useState(false);
  const prevFlags = usePrevious(tradeFlags);

  const isHighTwapNetworkFee =
    executionFeeUsd !== undefined && payUsd !== undefined && tradeFlags.isTwap && payUsd > 0n
      ? executionFeeUsd > payUsd / 20n
      : false;
  const prevIsHighTwapNetworkFee = usePrevious(isHighTwapNetworkFee);

  useEffect(() => {
    if (!shallowEqual(prevFlags, tradeFlags)) {
      setIsDismissed(false);
      return;
    }
  }, [prevFlags, tradeFlags]);

  const isHighCollateralImpact = getIsHighCollateralImpact(collateralNetPriceImpact);
  const prevIsHighCollateralImpact = usePrevious(isHighCollateralImpact);

  const isHighSwapImpact = getIsHighSwapImpact(swapPriceImpact);
  const prevIsHighSwapImpact = usePrevious(isHighSwapImpact);

  const isHightSwapProfitFee = Boolean(
    swapProfitFee && swapProfitFee.deltaUsd < 0 && bigMath.abs(swapProfitFee.bps) >= HIGH_SWAP_PROFIT_FEE_BPS
  );
  const prevIsHightSwapProfitFee = usePrevious(isHightSwapProfitFee);

  const isHighExternalSwapFees = getIsHighExternalSwapFees(externalSwapFeeItem);
  const prevIsHighExternalSwapFees = usePrevious(isHighExternalSwapFees);

  const prevWillDecreaseOrdersBeExecuted = usePrevious(willDecreaseOrdersBeExecuted);

  useEffect(
    function resetWarning() {
      if (
        !isDismissed ||
        prevIsHighCollateralImpact === undefined ||
        prevIsHighSwapImpact === undefined ||
        prevIsHightSwapProfitFee === undefined ||
        prevIsHightExecutionPrice === undefined ||
        prevWillDecreaseOrdersBeExecuted === undefined ||
        prevIsHighExternalSwapFees === undefined ||
        prevIsHighTwapNetworkFee === undefined
      ) {
        return;
      }

      if (
        prevIsHighCollateralImpact !== isHighCollateralImpact ||
        prevIsHighSwapImpact !== isHighSwapImpact ||
        prevIsHightSwapProfitFee !== isHightSwapProfitFee ||
        prevIsHightExecutionPrice !== isHightExecutionPrice ||
        prevWillDecreaseOrdersBeExecuted !== willDecreaseOrdersBeExecuted ||
        prevIsHighExternalSwapFees !== isHighExternalSwapFees ||
        prevIsHighTwapNetworkFee !== isHighTwapNetworkFee
      ) {
        setIsDismissed(false);
      }
    },
    [
      isDismissed,
      isHighCollateralImpact,
      isHighSwapImpact,
      isHightExecutionPrice,
      isHightSwapProfitFee,
      prevIsHighCollateralImpact,
      prevIsHighSwapImpact,
      prevIsHightExecutionPrice,
      prevIsHightSwapProfitFee,
      prevIsHighExternalSwapFees,
      prevWillDecreaseOrdersBeExecuted,
      willDecreaseOrdersBeExecuted,
      isHighExternalSwapFees,
      isHighTwapNetworkFee,
      prevIsHighTwapNetworkFee,
    ]
  );

  let validationError = false;
  let shouldShowWarning = false;
  let shouldShowWarningForSwap = false;
  let shouldShowWarningForCollateral = false;
  let shouldShowWarningForSwapProfitFee = false;
  let shouldShowWarningForExecutionFee = false;
  let shouldShowWarningForTriggerOrders = false;
  let shouldShowWarningForExternalSwap = false;
  let shouldShowWarningForTwapNetworkFee = false;

  shouldShowWarningForSwap = isHighSwapImpact;
  shouldShowWarningForSwapProfitFee = isHightSwapProfitFee && tradeFlags.isMarket;
  shouldShowWarningForExecutionFee = isHightExecutionPrice;
  shouldShowWarningForTriggerOrders = willDecreaseOrdersBeExecuted ?? false;
  shouldShowWarningForExternalSwap = isHighExternalSwapFees;
  shouldShowWarningForCollateral = isHighCollateralImpact && tradeFlags.isIncrease;
  shouldShowWarningForTwapNetworkFee = isHighTwapNetworkFee;

  shouldShowWarning =
    shouldShowWarningForCollateral ||
    shouldShowWarningForSwap ||
    shouldShowWarningForSwapProfitFee ||
    shouldShowWarningForExecutionFee ||
    shouldShowWarningForTriggerOrders ||
    shouldShowWarningForExternalSwap ||
    shouldShowWarningForTwapNetworkFee;

  const stableWarningState = useMemo<WarningState>(() => {
    return {
      shouldShowWarningForCollateral,
      shouldShowWarningForSwap,
      shouldShowWarningForSwapProfitFee,
      shouldShowWarningForExecutionFee,
      shouldShowWarningForTriggerOrders,
      shouldShowWarningForExternalSwap,
      shouldShowWarningForTwapNetworkFee,
      validationError,
      isDismissed,
      setIsDismissed,
      shouldShowWarning,
    };
  }, [
    shouldShowWarningForCollateral,
    shouldShowWarningForSwap,
    shouldShowWarningForSwapProfitFee,
    shouldShowWarningForExecutionFee,
    shouldShowWarningForTriggerOrders,
    shouldShowWarningForExternalSwap,
    shouldShowWarningForTwapNetworkFee,
    validationError,
    isDismissed,
    shouldShowWarning,
  ]);

  return stableWarningState;
}
