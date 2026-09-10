import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import {
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxLiquidity,
  selectTradeboxMaxLiquidityPath,
  selectTradeboxSwapAmounts,
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { convertToTokenAmount } from "domain/synthetics/tokens";

export const MAX_SIZE_WARNING_THRESHOLD_BPS = 8000n;

export function getMaxSizeWarningState(sizeUsd: bigint | undefined, maxSizeUsd: bigint | undefined) {
  const hasValues = sizeUsd !== undefined && sizeUsd > 0n && maxSizeUsd !== undefined;

  return {
    shouldShowMaxSize:
      hasValues && sizeUsd * BASIS_POINTS_DIVISOR_BIGINT >= maxSizeUsd * MAX_SIZE_WARNING_THRESHOLD_BPS,
    isSizeAboveMax: hasValues && sizeUsd > maxSizeUsd,
  };
}

export const selectTradeboxLiquidityInfo = createSelector((q) => {
  const tradeFlags = q(selectTradeboxTradeFlags);
  const swapAmounts = q(selectTradeboxSwapAmounts);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const toToken = q(selectTradeboxToToken);
  const { longLiquidity, shortLiquidity } = q(selectTradeboxLiquidity);
  const { maxLiquidity: swapLiquidityUsd } = q(selectTradeboxMaxLiquidityPath);
  const { isLong, isSwap, isIncrease } = tradeFlags;

  let sizeUsd: bigint | undefined;
  let maxSizeAmount: bigint | undefined;
  let maxSizeUsd: bigint | undefined;

  if (isSwap && swapAmounts?.swapStrategy.type === "internalSwap") {
    sizeUsd = swapAmounts.usdOut;
    maxSizeUsd = swapLiquidityUsd;

    maxSizeAmount = convertToTokenAmount(maxSizeUsd, toToken?.decimals, toToken?.prices.maxPrice);
  }

  if (isIncrease && increaseAmounts) {
    sizeUsd = increaseAmounts.sizeDeltaUsd;
    maxSizeUsd = isLong ? longLiquidity : shortLiquidity;
  }

  const { shouldShowMaxSize, isSizeAboveMax } = getMaxSizeWarningState(sizeUsd, maxSizeUsd);

  return {
    shouldShowMaxSize,
    isSizeAboveMax,
    maxSizeUsd,
    maxSizeAmount,
  };
});
