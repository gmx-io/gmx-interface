import { getPaxosTransitConfig } from "config/paxosTransit";
import { selectChainId, selectSrcChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxFromToken,
  selectTradeboxIsFromTokenGmxAccount,
  selectTradeboxMaxLiquidityPath,
  selectTradeboxSelectSwapToToken,
  selectTradeboxSwapAmounts,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import type { TransitRouteDirection } from "domain/synthetics/paxosTransit/transitRouteProgress";

export const selectTradeboxPaxosDirection = createSelector((q): TransitRouteDirection | undefined => {
  const { isSwap, isMarket } = q(selectTradeboxTradeFlags);

  if (!isSwap || !isMarket || q(selectTradeboxIsFromTokenGmxAccount) || q(selectSrcChainId) !== undefined) {
    return undefined;
  }

  const paxosTransitConfig = getPaxosTransitConfig(q(selectChainId));
  const fromToken = q(selectTradeboxFromToken);
  const toToken = q(selectTradeboxSelectSwapToToken);

  if (!paxosTransitConfig || !fromToken || !toToken) {
    return undefined;
  }

  const { usdcAddress, usdgAddress } = paxosTransitConfig;

  if (fromToken.address === usdcAddress && toToken.address === usdgAddress) {
    return "usdcToUsdg";
  }

  if (fromToken.address === usdgAddress && toToken.address === usdcAddress) {
    return "usdgToUsdc";
  }

  return undefined;
});

export const selectTradeboxInstantSwapAmountOut = createSelector((q): bigint | undefined => {
  const swapAmounts = q(selectTradeboxSwapAmounts);

  if (!swapAmounts || swapAmounts.amountOut <= 0n) {
    return undefined;
  }

  const { swapStrategy } = swapAmounts;

  if (swapStrategy.type === "externalSwap") {
    return swapAmounts.amountOut;
  }

  const swapPathStats = swapStrategy.swapPathStats;

  if (!swapPathStats?.swapPath.length || swapPathStats.swapSteps.some((step) => step.isOutLiquidity)) {
    return undefined;
  }

  const { maxLiquidity } = q(selectTradeboxMaxLiquidityPath);

  if (maxLiquidity === undefined || maxLiquidity < swapAmounts.usdOut) {
    return undefined;
  }

  return swapAmounts.amountOut;
});
