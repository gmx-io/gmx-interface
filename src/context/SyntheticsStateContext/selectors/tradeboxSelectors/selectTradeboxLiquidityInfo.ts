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
import { bigMath } from "lib/bigmath";

const RISK_THRESHOLD_BPS = 5000n;

export const selectTradeboxLiquidityInfo = createSelector((q) => {
  const tradeFlags = q(selectTradeboxTradeFlags);
  const swapAmounts = q(selectTradeboxSwapAmounts);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const toToken = q(selectTradeboxToToken);
  const { longLiquidity, shortLiquidity } = q(selectTradeboxLiquidity);
  const { maxLiquidity: swapLiquidityUsd } = q(selectTradeboxMaxLiquidityPath);
  const { isLong, isLimit, isSwap, isIncrease } = tradeFlags;

  let isLiquidityRisk = false;
  let availableLiquidityAmount: bigint | undefined = undefined;
  let availableLiquidityUsd: bigint | undefined = undefined;

  if (isLimit) {
    if (isSwap && swapAmounts) {
      availableLiquidityUsd = swapLiquidityUsd;

      isLiquidityRisk =
        bigMath.mulDiv(availableLiquidityUsd, RISK_THRESHOLD_BPS, BASIS_POINTS_DIVISOR_BIGINT) < swapAmounts.usdOut;
      availableLiquidityAmount = convertToTokenAmount(
        availableLiquidityUsd,
        toToken?.decimals,
        toToken?.prices.maxPrice
      );
    }

    if (isIncrease && increaseAmounts) {
      availableLiquidityUsd = isLong ? longLiquidity : shortLiquidity;

      isLiquidityRisk =
        bigMath.mulDiv(availableLiquidityUsd!, RISK_THRESHOLD_BPS, BASIS_POINTS_DIVISOR_BIGINT) <
        increaseAmounts.sizeDeltaUsd;
    }
  }

  return {
    isLiquidityRisk,
    availableLiquidityUsd,
    availableLiquidityAmount,
  };
});
