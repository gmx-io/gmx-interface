import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { bigNumberBinarySearch } from "lib/binarySearch";
import { expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { convertToUsd } from "sdk/utils/tokens";
import type { TokenData } from "sdk/utils/tokens/types";
import type { FindSwapPath, SwapPathStats } from "sdk/utils/trade/types";

const CLOSE_TO_LIQUIDATION_BPS = 500n;

export function getIsSwapPathFillable(swapPathStats: SwapPathStats | undefined): boolean {
  return (
    swapPathStats !== undefined &&
    swapPathStats.swapPath.length > 0 &&
    swapPathStats.swapSteps.every((step) => !step.isOutLiquidity && !step.isOutCapacity && !step.isOutMaxFactor)
  );
}

export function getMaxInstantSwapAmount({
  tokenIn,
  maxAmountIn,
  findSwapPath,
}: {
  tokenIn: TokenData;
  maxAmountIn: bigint;
  findSwapPath: FindSwapPath;
}): bigint {
  const getIsFillable = (amountIn: bigint) =>
    getIsSwapPathFillable(findSwapPath(convertToUsd(amountIn, tokenIn.decimals, tokenIn.prices.minPrice)!));

  if (maxAmountIn <= 0n || !getIsFillable(1n)) {
    return 0n;
  }

  if (getIsFillable(maxAmountIn)) {
    return maxAmountIn;
  }

  // a cent of precision keeps the whole-token result exact with half the route calculations of 1 wei
  const { result } = bigNumberBinarySearch(
    1n,
    maxAmountIn,
    expandDecimals(1, Math.max(tokenIn.decimals - 2, 0)),
    (amountIn) => ({
      isValid: getIsFillable(amountIn),
      returnValue: null,
    })
  );

  // whole tokens keep the suggested amount readable and safely under the limit
  return (result / expandDecimals(1, tokenIn.decimals)) * expandDecimals(1, tokenIn.decimals);
}

export function getShouldDefaultToUsdc({
  usdgBalance,
  usdcBalance,
}: {
  usdgBalance: bigint | undefined;
  usdcBalance: bigint | undefined;
}): boolean {
  return (usdgBalance === undefined || usdgBalance === 0n) && usdcBalance !== undefined && usdcBalance > 0n;
}

export function getIsCloseToLiquidation({
  markPrice,
  liquidationPrice,
}: {
  markPrice: bigint | undefined;
  liquidationPrice: bigint | undefined;
}): boolean {
  if (markPrice === undefined || liquidationPrice === undefined || markPrice <= 0n || liquidationPrice <= 0n) {
    return false;
  }

  return (
    bigMath.abs(markPrice - liquidationPrice) * BASIS_POINTS_DIVISOR_BIGINT <= markPrice * CLOSE_TO_LIQUIDATION_BPS
  );
}
