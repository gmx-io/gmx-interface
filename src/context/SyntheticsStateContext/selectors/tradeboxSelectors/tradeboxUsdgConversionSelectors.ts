import { getUsdgConversionTokenAddress } from "config/usdgPools";
import {
  selectChainId,
  selectMarketsInfoData,
  selectTokensData,
  selectUiFeeFactor,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
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
import { getSwapAmountsByFromValue } from "sdk/utils/swap/swapValues";

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

// limit, stop market and TWAP orders would convert only at trigger and freeze if our pool is short then
export const selectTradeboxIsUsdgConvertFirst = createSelector((q) => {
  const { isLimit, isTwap } = q(selectTradeboxTradeFlags);

  if (!q(selectTradeboxIsPayingUsdcForUsdg) || (!isLimit && !isTwap)) {
    return false;
  }

  // the aggregator swaps a limit open when it's created, so that order already holds USDG
  return q(selectTradeboxIncreasePositionAmounts)?.swapStrategy.type !== "externalSwap";
});

export const selectTradeboxUsdgConversionFindSwapPath = createSelector((q) => {
  const usdcAddress = q(selectTradeboxUsdgConversionTokenAddress);

  return q(makeSelectFindSwapPath(usdcAddress, q(selectTradeboxCollateralTokenAddress)));
});

export const selectTradeboxUsdgConvertFirstSwapAmounts = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const usdgToken = collateralTokenAddress ? q(selectTokensData)?.[collateralTokenAddress] : undefined;

  if (!q(selectTradeboxIsUsdgConvertFirst) || !fromToken || !usdgToken || fromTokenAmount === undefined) {
    return undefined;
  }

  return getSwapAmountsByFromValue({
    tokenIn: fromToken,
    tokenOut: usdgToken,
    amountIn: fromTokenAmount,
    isLimit: false,
    uiFeeFactor: q(selectUiFeeFactor),
    marketsInfoData: q(selectMarketsInfoData),
    chainId: q(selectChainId),
    externalSwapQuoteParams: undefined,
    findSwapPath: q(selectTradeboxUsdgConversionFindSwapPath),
    allowSameTokenSwap: false,
  });
});

// opens the aggregator can take fall back to it; the convert-first swap goes through our pool only
export const selectTradeboxIsUsdgConversionTooLarge = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);

  // an amount over the balance keeps its "Insufficient balance" error and gets no conversion choices
  if (
    q(selectMarketsInfoData) === undefined ||
    !fromToken ||
    fromTokenAmount === undefined ||
    fromTokenAmount > (fromToken.balance ?? 0n)
  ) {
    return false;
  }

  if (q(selectTradeboxIsUsdgConvertFirst)) {
    const swapAmounts = q(selectTradeboxUsdgConvertFirstSwapAmounts);

    return (
      !q(selectExternalSwapIsLoading) &&
      getIsSwapTooLargeToFill({
        tokenIn: fromToken,
        amountIn: fromTokenAmount,
        swapPathStats: swapAmounts?.swapStrategy.swapPathStats,
      })
    );
  }

  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);

  return (
    q(selectTradeboxIsPayingUsdcForUsdg) &&
    q(selectTradeboxTradeFlags).isMarket &&
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
