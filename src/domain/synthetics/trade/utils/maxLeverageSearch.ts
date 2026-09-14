import { BASIS_POINTS_DIVISOR } from "config/factors";
import { numericBinarySearch } from "lib/binarySearch";
import { OrderType } from "sdk/utils/orders/types";
import { getIncreaseEvaluationIndexPrice } from "sdk/utils/prices";
import { getIncreasePositionAmounts, getNextPositionValuesForIncreaseTrade } from "sdk/utils/trade/increase";
import { getIncreaseResultingPositionMarginState } from "sdk/utils/trade/increaseMarginCheck";
import type { IncreasePositionAmounts } from "sdk/utils/trade/types";

import { getIsMaxLeverageExceeded } from "./validation";

type IncreasePositionAmountsParams = Parameters<typeof getIncreasePositionAmounts>[0];

export type MaxLeverageIncreaseParams = Omit<IncreasePositionAmountsParams, "leverage" | "strategy"> & {
  maxAllowedLeverage: number;
  minCollateralUsd: bigint;
};

export type MaxLeverageIncrease = {
  leverage: number;
  increaseAmounts: IncreasePositionAmounts;
};

const LEVERAGE_STEPS_PER_UNIT = 10;
const LOWEST_LEVERAGE_STEP = 1;
const LOWEST_PROBED_LEVERAGE_STEP = LOWEST_LEVERAGE_STEP + 1;

function getHighestLeverageStep(maxAllowedLeverage: number): number {
  return (LEVERAGE_STEPS_PER_UNIT * maxAllowedLeverage) / BASIS_POINTS_DIVISOR;
}

function evaluateLeverageStep(
  { maxAllowedLeverage: _maxAllowedLeverage, minCollateralUsd, ...increaseParams }: MaxLeverageIncreaseParams,
  leverageStep: number
): { isValid: boolean; increaseAmounts: IncreasePositionAmounts } {
  const { marketInfo, collateralToken, isLong, position, triggerPrice, limitOrderType, userReferralInfo } =
    increaseParams;

  const increaseAmounts = getIncreasePositionAmounts({
    ...increaseParams,
    strategy: "leverageByCollateral",
    leverage: BigInt((leverageStep / LEVERAGE_STEPS_PER_UNIT) * BASIS_POINTS_DIVISOR),
    triggerPrice: limitOrderType !== undefined ? triggerPrice : undefined,
  });

  const nextPositionValues = getNextPositionValuesForIncreaseTrade({
    collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
    collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
    collateralToken,
    existingPosition: position,
    indexPrice: increaseAmounts.indexPrice,
    isLong,
    marketInfo,
    minCollateralUsd,
    showPnlInLeverage: false,
    sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
    sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
    positionPriceImpactDeltaUsd: increaseAmounts.positionPriceImpactDeltaUsd,
    userReferralInfo,
  });

  if (nextPositionValues.nextLeverage === undefined) {
    return { isValid: false, increaseAmounts };
  }

  const isMaxLeverageExceeded = getIsMaxLeverageExceeded(
    nextPositionValues.nextLeverage,
    marketInfo,
    isLong,
    increaseAmounts.sizeDeltaUsd
  );

  const resultingPositionMarginState = getIncreaseResultingPositionMarginState({
    marketInfo,
    collateralToken,
    isLong,
    existingPosition: position,
    sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
    sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
    collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
    minCollateralUsd,
    userReferralInfo,
    proDiscountFactor: increaseParams.proDiscountFactor,
    indexPriceForEvaluation: getIncreaseEvaluationIndexPrice({
      orderType: increaseAmounts.limitOrderType ?? OrderType.MarketIncrease,
      triggerPrice,
    }),
  });

  return {
    isValid: !isMaxLeverageExceeded && resultingPositionMarginState?.isLiquidatable !== true,
    increaseAmounts,
  };
}

export function getIsMaxLeverageIncreaseAvailable(params: MaxLeverageIncreaseParams): boolean {
  return evaluateLeverageStep(params, LOWEST_PROBED_LEVERAGE_STEP).isValid;
}

export function findMaxLeverageIncrease(params: MaxLeverageIncreaseParams): MaxLeverageIncrease | undefined {
  const { result, returnValue } = numericBinarySearch<IncreasePositionAmounts | undefined>(
    LOWEST_LEVERAGE_STEP,
    getHighestLeverageStep(params.maxAllowedLeverage),
    (leverageStep) => {
      const { isValid, increaseAmounts } = evaluateLeverageStep(params, leverageStep);

      return { isValid, returnValue: increaseAmounts };
    }
  );

  if (returnValue === undefined) {
    return undefined;
  }

  return { leverage: result, increaseAmounts: returnValue };
}
