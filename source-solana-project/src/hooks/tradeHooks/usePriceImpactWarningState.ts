import { BN_ZERO } from '@/config/constants';
import {
  HIGH_COLLATERAL_IMPACT_BPS,
  HIGH_POSITION_IMPACT_BPS,
  HIGH_SWAP_IMPACT_BPS,
  HIGH_SWAP_PROFIT_FEE_BPS,
} from '@/config/factors';
import { FeeItem } from '@/selectors/fee/types';
import { TradeFlags } from '@/selectors/trade/types';
import { usePrevious } from '@/utils/lib/usePrevious';
import isEqual from 'lodash/isEqual';
import { useEffect, useMemo, useState } from 'react';

export type PriceImpactWarningState = ReturnType<
  typeof usePriceImpactWarningState
>;

export function usePriceImpactWarningState({
  collateralImpact,
  positionImpact,
  swapPriceImpact,
  swapProfitFee,
  //   executionFeeUsd,
  tradeFlags,
}: {
  collateralImpact?: FeeItem;
  positionImpact?: FeeItem;
  swapPriceImpact?: FeeItem;
  swapProfitFee?: FeeItem;
  //   executionFeeUsd?: BN;
  tradeFlags: TradeFlags;
}) {
  //   const isHightExecutionPrice = executionFeeUsd === undefined ? false : executionFeeUsd >= veryHighExecutionFeeUsd;
  //   const prevIsHightExecutionPrice = usePrevious(isHightExecutionPrice);
  const isHightExecutionPrice = false;
  const prevIsHightExecutionPrice = usePrevious(isHightExecutionPrice);

  const [isAccepted, setIsAccepted] = useState(false);
  const prevFlags = usePrevious(tradeFlags);

  useEffect(() => {
    if (!isEqual(prevFlags, tradeFlags)) {
      setIsAccepted(false);
      return;
    }
  }, [prevFlags, tradeFlags]);

  const isHighPositionImpact = Boolean(
    positionImpact &&
      positionImpact.deltaUsd.lt(BN_ZERO) &&
      Math.abs(positionImpact.bps) >= HIGH_POSITION_IMPACT_BPS
  );
  const prevIsHighPositionImpact = usePrevious(isHighPositionImpact);

  const isHighCollateralImpact = Boolean(
    collateralImpact &&
      collateralImpact.deltaUsd.lt(BN_ZERO) &&
      Math.abs(collateralImpact.bps) >= HIGH_COLLATERAL_IMPACT_BPS
  );
  const prevIsHighCollateralImpact = usePrevious(isHighCollateralImpact);

  const isHighSwapImpact = Boolean(
    swapPriceImpact &&
      swapPriceImpact.deltaUsd.lt(BN_ZERO) &&
      Math.abs(swapPriceImpact.bps) >= HIGH_SWAP_IMPACT_BPS
  );
  const prevIsHighSwapImpact = usePrevious(isHighSwapImpact);

  const isHightSwapProfitFee = Boolean(
    swapProfitFee &&
      swapProfitFee.deltaUsd.lt(BN_ZERO) &&
      Math.abs(swapProfitFee.bps) >= HIGH_SWAP_PROFIT_FEE_BPS
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
