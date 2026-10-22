import { getUsdgConversionTokenAddress } from "config/usdgPools";
import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectExternalSwapIsLoading,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getIsSwapTooLargeToFill, getMaxInstantSwapAmount } from "domain/synthetics/usdgPools/usdcConversion";

const selectTradeboxUsdgConversionTokenAddress = createSelector((q) =>
  getUsdgConversionTokenAddress(q(selectChainId), q(selectTradeboxCollateralTokenAddress))
);

export const selectTradeboxIsPayingUsdcForUsdg = createSelector((q) => {
  const usdcAddress = q(selectTradeboxUsdgConversionTokenAddress);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);

  return (
    q(selectTradeboxTradeFlags).isIncrease &&
    usdcAddress !== undefined &&
    q(selectTradeboxFromToken)?.address === usdcAddress &&
    fromTokenAmount !== undefined &&
    fromTokenAmount > 0n
  );
});

export const selectTradeboxUsdgConversionFindSwapPath = createSelector((q) => {
  const usdcAddress = q(selectTradeboxUsdgConversionTokenAddress);

  return q(makeSelectFindSwapPath(usdcAddress, q(selectTradeboxCollateralTokenAddress)));
});

// neither our pool nor the aggregator can convert the USDC margin of a market open
export const selectTradeboxIsUsdgConversionTooLarge = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);

  // an amount over the balance keeps its "Insufficient balance" error and gets no conversion choices
  return (
    q(selectTradeboxIsPayingUsdcForUsdg) &&
    q(selectTradeboxTradeFlags).isMarket &&
    q(selectMarketsInfoData) !== undefined &&
    fromToken !== undefined &&
    fromTokenAmount !== undefined &&
    fromTokenAmount <= (fromToken.balance ?? 0n) &&
    increaseAmounts !== undefined &&
    increaseAmounts.swapStrategy.type !== "externalSwap" &&
    !q(selectExternalSwapIsLoading) &&
    getIsSwapTooLargeToFill({
      tokenIn: fromToken,
      amountIn: fromTokenAmount,
      swapPathStats: increaseAmounts.swapStrategy.swapPathStats,
    })
  );
});

export const selectTradeboxUsdgMaxInstantAmount = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);

  if (!q(selectTradeboxIsUsdgConversionTooLarge) || !fromToken || fromTokenAmount === undefined) {
    return undefined;
  }

  return getMaxInstantSwapAmount({
    tokenIn: fromToken,
    maxAmountIn: fromTokenAmount,
    findSwapPath: q(selectTradeboxUsdgConversionFindSwapPath),
  });
});
