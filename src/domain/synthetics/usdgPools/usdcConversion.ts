import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { bigNumberBinarySearch } from "lib/binarySearch";
import { expandDecimals, formatTokenAmount } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { convertToUsd } from "sdk/utils/tokens";
import type { TokenData } from "sdk/utils/tokens/types";
import type { FindSwapPath, SwapPathStats } from "sdk/utils/trade/types";

const CLOSE_TO_LIQUIDATION_BPS = 500n;
const MAX_INSTANT_MARGIN_BPS = 50n;

export function getIsSwapPathFillable(swapPathStats: SwapPathStats | undefined): boolean {
  return (
    swapPathStats !== undefined &&
    swapPathStats.swapPath.length > 0 &&
    swapPathStats.swapSteps.every((step) => !step.isOutLiquidity && !step.isOutCapacity && !step.isOutMaxFactor)
  );
}

// the route finder has no path for sub-cent amounts, so nothing below one whole token counts as too large
export function getIsSwapTooLargeToFill({
  tokenIn,
  amountIn,
  swapPathStats,
}: {
  tokenIn: TokenData;
  amountIn: bigint;
  swapPathStats: SwapPathStats | undefined;
}): boolean {
  return amountIn >= expandDecimals(1, tokenIn.decimals) && !getIsSwapPathFillable(swapPathStats);
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
  const oneToken = expandDecimals(1, tokenIn.decimals);
  const getIsFillable = (amountIn: bigint) =>
    getIsSwapPathFillable(findSwapPath(convertToUsd(amountIn, tokenIn.decimals, tokenIn.prices.minPrice)!));

  if (maxAmountIn < oneToken || !getIsFillable(oneToken)) {
    return 0n;
  }

  if (getIsFillable(maxAmountIn)) {
    return maxAmountIn;
  }

  const { result } = bigNumberBinarySearch(oneToken, maxAmountIn, oneToken, (amountIn) => ({
    isValid: getIsFillable(amountIn),
    returnValue: null,
  }));

  // the limit moves with prices and pool state, so the suggestion stays a margin below it to still fill seconds later
  const withMargin = bigMath.mulDiv(
    result,
    BASIS_POINTS_DIVISOR_BIGINT - MAX_INSTANT_MARGIN_BPS,
    BASIS_POINTS_DIVISOR_BIGINT
  );

  return (withMargin / oneToken) * oneToken;
}

export function formatMaxInstantAmount(tokenIn: TokenData, amount: bigint) {
  return formatTokenAmount(amount, tokenIn.decimals, tokenIn.symbol, { displayDecimals: 0, useCommas: true });
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
